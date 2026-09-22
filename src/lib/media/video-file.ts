import {
  SPECIALIST_VIDEO_MAX_SECONDS,
  specialistVideoTooLargeMessage,
  specialistVideoTooLongMessage,
} from "@/lib/specialist-media-limits";
import { SPECIALIST_STORAGE_LIMITS } from "@/lib/supabase/constants";

const ALLOWED_VIDEO_MIME = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
]);

export function resolveVideoContentType(file: File): string | null {
  const type = (file.type || "").toLowerCase().trim();
  if (ALLOWED_VIDEO_MIME.has(type)) return type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".mov") || name.endsWith(".qt")) return "video/quicktime";
  if (name.endsWith(".mp4") || name.endsWith(".m4v")) return "video/mp4";
  if (name.endsWith(".webm")) return "video/webm";
  return null;
}

export function extensionForVideoMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime") || mime.includes("x-m4v")) return "mov";
  return "mp4";
}

export function rejectUnsupportedPhoneVideo(file: File): string | null {
  if (!resolveVideoContentType(file)) {
    return "Use a phone video (MP4 or MOV).";
  }
  return null;
}

/**
 * iOS Safari can report Infinity, 0, or a leftover from seeking to 1e101.
 * Ten minutes is well above the 45s product cap and far below those bogus values.
 */
const MAX_PLAUSIBLE_PHONE_CLIP_SECONDS = 600;

function hasUsableDuration(duration: number): boolean {
  return (
    Number.isFinite(duration) &&
    duration > 0 &&
    duration < MAX_PLAUSIBLE_PHONE_CLIP_SECONDS
  );
}

export function rejectVideoOverDuration(durationSeconds: number): string | null {
  if (!hasUsableDuration(durationSeconds)) {
    return "Could not read this video. Try another clip.";
  }
  if (durationSeconds > SPECIALIST_VIDEO_MAX_SECONDS + 0.05) {
    return specialistVideoTooLongMessage();
  }
  return null;
}

/** Browser-only. iOS sometimes reports Infinity / 0 until we seek. */
export async function readVideoDurationSeconds(file: File): Promise<number> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Could not read this video. Try another clip.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<number>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;

      const timeout = window.setTimeout(() => {
        reject(new Error("Could not read this video. Try another clip."));
      }, 12000);

      function finish(duration: number) {
        window.clearTimeout(timeout);
        video.removeEventListener("timeupdate", onProbe);
        video.removeEventListener("seeked", onProbe);
        if (!hasUsableDuration(duration)) {
          reject(new Error("Could not read this video. Try another clip."));
          return;
        }
        resolve(duration);
      }

      function onProbe() {
        if (!hasUsableDuration(video.duration)) return;
        video.currentTime = 0;
        finish(video.duration);
      }

      function probeDuration() {
        if (hasUsableDuration(video.duration)) {
          finish(video.duration);
          return;
        }
        video.addEventListener("timeupdate", onProbe);
        video.addEventListener("seeked", onProbe);
        video.currentTime = 1e101;
      }

      video.onloadedmetadata = () => probeDuration();
      video.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error("Could not read this video. Try another clip."));
      };
      video.src = objectUrl;
      video.load();
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Type, then 45s (the product cap), then a hard storage ceiling.
 * 4K and 1080p are both allowed if the clip is 45 seconds or less.
 */
export async function inspectPhoneVideoFile(
  file: File
): Promise<{ duration: number }> {
  const typeReject = rejectUnsupportedPhoneVideo(file);
  if (typeReject) {
    throw new Error(typeReject);
  }
  const duration = await readVideoDurationSeconds(file);
  const durationReject = rejectVideoOverDuration(duration);
  if (durationReject) {
    throw new Error(durationReject);
  }
  if (file.size > SPECIALIST_STORAGE_LIMITS.galleryVideo) {
    throw new Error(specialistVideoTooLargeMessage());
  }
  return { duration };
}

export function formatClipSecondsLabel(duration: number): string {
  const seconds = Math.max(0, Math.round(duration));
  return `${seconds}s`;
}

export function formatPlayerClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export function isLikelyVideoUrl(url: string): boolean {
  const path = url.split("?")[0]?.split("#")[0]?.toLowerCase() ?? "";
  return /\.(mp4|mov|webm|m4v)$/.test(path);
}

/** Keep base64 JSON under typical serverless body limits (~4.5MB). */
const POSTER_MAX_DATA_URL_CHARS = 3_800_000;

function encodePosterDataUrl(
  canvas: HTMLCanvasElement,
  quality: number
): string {
  let outQuality = quality;
  let dataUrl = canvas.toDataURL("image/jpeg", outQuality);
  while (dataUrl.length > POSTER_MAX_DATA_URL_CHARS && outQuality > 0.45) {
    outQuality -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", outQuality);
  }
  return dataUrl;
}

const HAVE_CURRENT_DATA = 2;

function clampMediaTime(video: HTMLVideoElement, time: number): number {
  const safe = Number.isFinite(time) ? Math.max(0, time) : 0;
  const duration = video.duration;
  if (!Number.isFinite(duration) || duration <= 0) return safe;
  return Math.min(Math.max(0, duration - 0.001), safe);
}

function waitForPresentedFrame(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const requestFrame = video.requestVideoFrameCallback?.bind(video);
    if (requestFrame) {
      requestFrame(() => finish());
    } else {
      requestAnimationFrame(() => requestAnimationFrame(finish));
    }
    window.setTimeout(finish, 400);
  });
}

/**
 * Seek and resolve even when the element is already on that timestamp.
 * Chrome and WebKit skip the `seeked` event when `currentTime` does not change,
 * which left the thumbnail confirm control spinning forever.
 */
export function seekVideoToTime(
  video: HTMLVideoElement,
  time: number
): Promise<void> {
  const target = clampMediaTime(video, time);
  const alreadyThere =
    video.readyState >= HAVE_CURRENT_DATA &&
    Math.abs(video.currentTime - target) < 0.04;

  if (alreadyThere) return waitForPresentedFrame(video);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener("seeked", onSeeked);
      window.clearTimeout(timer);
      void waitForPresentedFrame(video).then(resolve);
    };
    const onSeeked = () => finish();
    const timer = window.setTimeout(finish, 2000);
    video.addEventListener("seeked", onSeeked);
    try {
      video.currentTime = target;
    } catch {
      finish();
    }
  });
}

function waitForVideoEvent(
  video: HTMLVideoElement,
  eventName: "loadedmetadata" | "loadeddata",
  timeoutMs: number
): Promise<void> {
  if (
    eventName === "loadedmetadata"
      ? video.readyState >= 1
      : video.readyState >= HAVE_CURRENT_DATA
  ) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const finish = () => {
      video.removeEventListener(eventName, finish);
      video.removeEventListener("error", finish);
      window.clearTimeout(timer);
      resolve();
    };
    video.addEventListener(eventName, finish);
    video.addEventListener("error", finish);
    const timer = window.setTimeout(finish, timeoutMs);
  });
}

/**
 * Decode a visible still. Time 0 is often blank, and `preload="metadata"`
 * never paints a frame until something actually seeks or plays.
 */
export async function primeVideoPreviewFrame(
  video: HTMLVideoElement
): Promise<number> {
  video.muted = true;
  video.playsInline = true;
  await waitForVideoEvent(video, "loadedmetadata", 8000);
  if (video.error) {
    throw new Error("Could not play this video. Try another clip.");
  }

  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  const start = duration > 0.3 ? Math.min(0.12, duration * 0.03) : 0.001;

  try {
    await video.play();
    video.pause();
  } catch {
    // Autoplay can be blocked. A real seek still decodes a frame.
  }

  await seekVideoToTime(video, start);
  if (!video.videoWidth || video.error) {
    throw new Error("Could not play this video. Try another clip.");
  }
  return start;
}

export async function captureVideoFrameDataUrl(
  video: HTMLVideoElement,
  maxEdge = 1080
): Promise<string> {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    throw new Error("Could not capture that frame.");
  }

  let edge = Math.min(maxEdge, Math.max(width, height));
  for (let attempt = 0; attempt < 4; attempt++) {
    const scale = edge / Math.max(width, height);
    const outWidth = Math.max(1, Math.round(width * scale));
    const outHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not capture that frame.");
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(video, 0, 0, outWidth, outHeight);
    const dataUrl = encodePosterDataUrl(canvas, 0.82);
    if (dataUrl.length <= POSTER_MAX_DATA_URL_CHARS) {
      return dataUrl;
    }
    edge = Math.max(480, Math.round(edge * 0.75));
  }

  throw new Error("Could not capture that frame.");
}
