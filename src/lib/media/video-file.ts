import { SPECIALIST_VIDEO_MAX_SECONDS } from "@/lib/specialist-media-limits";

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

export function rejectVideoOverDuration(durationSeconds: number): string | null {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return "Could not read this video. Try another clip.";
  }
  if (durationSeconds > SPECIALIST_VIDEO_MAX_SECONDS + 0.05) {
    return "Keep clips to 45 seconds or less.";
  }
  return null;
}

/** Browser-only. iOS sometimes reports Infinity until we seek. */
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
        if (!Number.isFinite(duration) || duration <= 0) {
          reject(new Error("Could not read this video. Try another clip."));
          return;
        }
        resolve(duration);
      }

      video.onloadedmetadata = () => {
        if (video.duration === Infinity) {
          video.currentTime = 1e101;
          video.ontimeupdate = () => {
            video.ontimeupdate = null;
            finish(video.duration);
          };
          return;
        }
        finish(video.duration);
      };
      video.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error("Could not read this video. Try another clip."));
      };
      video.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function formatClipSecondsLabel(duration: number): string {
  const seconds = Math.max(0, Math.round(duration));
  return `${seconds}s`;
}

export function isLikelyVideoUrl(url: string): boolean {
  const path = url.split("?")[0]?.split("#")[0]?.toLowerCase() ?? "";
  return /\.(mp4|mov|webm|m4v)$/.test(path);
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
  let outWidth = width;
  let outHeight = height;
  if (Math.max(outWidth, outHeight) > maxEdge) {
    const scale = maxEdge / Math.max(outWidth, outHeight);
    outWidth = Math.max(1, Math.round(outWidth * scale));
    outHeight = Math.max(1, Math.round(outHeight * scale));
  }
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
  return canvas.toDataURL("image/jpeg", 0.86);
}
