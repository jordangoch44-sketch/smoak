import { isMarketplaceSupabaseActive } from "@/lib/auth/marketplace-auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { specialistVideoTooLargeMessage } from "@/lib/specialist-media-limits";
import {
  SPECIALIST_MEDIA_BUCKET,
  SPECIALIST_STORAGE_LIMITS,
} from "@/lib/supabase/constants";
import {
  rejectUnsupportedPhoneVideo,
  resolveVideoContentType,
} from "@/lib/media/video-file";
import {
  sendWithUploadProgress,
  signedStorageUploadBody,
  type UploadProgressHandler,
} from "@/lib/media/upload-progress";

/** Same ceiling as `/api/media/specialist-application`. */
const APPLICATION_MEDIA_MAX_BYTES = 8 * 1024 * 1024;

export type { UploadProgressHandler };

/** Storage object prefix for `/api/media/specialist-application` SAFE_PATH. */
function specialistMediaPathId(specialistId: string): string {
  return (
    specialistId
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 128) || "specialist"
  );
}

export type SpecialistDashboardMediaKind =
  | "profile"
  | "gallery"
  | "transformation";

export function rejectUnsupportedPhonePhoto(file: File): string | null {
  const type = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  if (
    type.includes("heic") ||
    type.includes("heif") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  ) {
    return "Use JPEG or PNG (on iPhone: Format → Most Compatible).";
  }
  return null;
}

function storagePutError(
  status: number,
  text: string,
  fallback = "Could not upload image."
): string {
  let message = "";
  try {
    const payload = JSON.parse(text) as { message?: string; error?: string };
    message = payload.message || payload.error || "";
  } catch {
    message = text.trim();
  }
  if (!message && status === 413) return "payload too large";
  return message || fallback;
}

/**
 * Ask for a signed storage URL, then PUT the file from the browser.
 * Progress is the share of bytes storage has received.
 */
export async function postSpecialistApplicationMedia(
  path: string,
  dataUrl: string,
  onProgress?: UploadProgressHandler
): Promise<string> {
  const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const fileResponse = await fetch(dataUrl);
  if (!fileResponse.ok) {
    throw new Error("Could not read that photo.");
  }
  const file = await fileResponse.blob();
  const contentType = (file.type || "image/jpeg").toLowerCase();
  if (file.size <= 0 || file.size > APPLICATION_MEDIA_MAX_BYTES) {
    throw new Error("Photo is too large to upload.");
  }

  const response = await fetch("/api/media/specialist-application", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, contentType }),
  });
  const payload = (await response.json().catch(() => null)) as
    | { ok: boolean; signedUrl?: string; publicUrl?: string; message?: string }
    | null;
  if (!response.ok || !payload?.ok || !payload.signedUrl || !payload.publicUrl) {
    throw new Error(
      isObjectTooLargeMessage(payload?.message) || response.status === 413
        ? "Photo is too large to upload."
        : (payload?.message ??
          (response.status === 401
            ? "Sign in again to upload photos."
            : "Could not upload image."))
    );
  }

  const put = await sendWithUploadProgress(payload.signedUrl, {
    method: "PUT",
    body: signedStorageUploadBody(file, "60"),
    onProgress,
  });
  if (!put.ok) {
    const message = storagePutError(put.status, put.text);
    throw new Error(
      isObjectTooLargeMessage(message) || put.status === 413
        ? "Photo is too large to upload."
        : message
    );
  }

  return payload.publicUrl.includes("?")
    ? `${payload.publicUrl}&v=${stamp}`
    : `${payload.publicUrl}?v=${stamp}`;
}

function dashboardMediaPath(
  specialistId: string,
  kind: SpecialistDashboardMediaKind
): string {
  const id = specialistMediaPathId(specialistId);
  const token = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  if (kind === "profile") return `${id}/profile/avatar-${token}`;
  if (kind === "transformation") return `${id}/gallery/t-${token}/image`;
  return `${id}/gallery/g-${token}/image`;
}

function dashboardVideoPath(specialistId: string): string {
  const id = specialistMediaPathId(specialistId);
  const token = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return `${id}/gallery/v-${token}/clip`;
}

function cacheBustUrl(url: string): string {
  const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return url.includes("?") ? `${url}&v=${stamp}` : `${url}?v=${stamp}`;
}

function isObjectTooLargeMessage(message: string | undefined): boolean {
  const lower = (message ?? "").toLowerCase();
  return (
    lower.includes("exceeded the maximum allowed size") ||
    lower.includes("payload too large") ||
    lower.includes("entity too large") ||
    lower.includes("maximum allowed size")
  );
}

function videoUploadErrorMessage(message: string | undefined): string {
  if (isObjectTooLargeMessage(message)) {
    return specialistVideoTooLargeMessage();
  }
  const trimmed = message?.trim() ?? "";
  return trimmed || "Could not upload video.";
}

/**
 * Upload a phone video via signed URL (not a data URL — clips are too large).
 */
export async function uploadSpecialistDashboardVideo(
  specialistId: string | null | undefined,
  file: File,
  onProgress?: UploadProgressHandler
): Promise<string> {
  const id = specialistId?.trim();
  if (!id) {
    throw new Error(
      "Could not upload — profile is not ready. Refresh and try again."
    );
  }
  if (!isMarketplaceSupabaseActive()) {
    throw new Error(
      "Video upload needs a live connection. Try again in a moment."
    );
  }

  const typeReject = rejectUnsupportedPhoneVideo(file);
  if (typeReject) {
    throw new Error(typeReject);
  }
  if (file.size > SPECIALIST_STORAGE_LIMITS.galleryVideo) {
    throw new Error(specialistVideoTooLargeMessage());
  }

  const contentType = resolveVideoContentType(file);
  if (!contentType) {
    throw new Error("Use a phone video (MP4 or MOV).");
  }

  const path = dashboardVideoPath(id);
  const response = await fetch("/api/media/specialist-video", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, contentType }),
  });
  const payload = (await response.json().catch(() => null)) as
    | {
        ok: boolean;
        path?: string;
        token?: string;
        signedUrl?: string;
        publicUrl?: string;
        message?: string;
      }
    | null;
  if (!response.ok || !payload?.ok || !payload.path || !payload.publicUrl) {
    throw new Error(
      videoUploadErrorMessage(
        payload?.message ??
          (response.status === 413
            ? specialistVideoTooLargeMessage()
            : response.status === 401
              ? "Sign in again to upload videos."
              : "Could not start video upload.")
      )
    );
  }

  if (payload.signedUrl) {
    const put = await sendWithUploadProgress(payload.signedUrl, {
      method: "PUT",
      body: signedStorageUploadBody(file),
      onProgress,
    });
    if (!put.ok) {
      throw new Error(
        videoUploadErrorMessage(
          storagePutError(
            put.status,
            put.text ||
              (put.status === 413 ? specialistVideoTooLargeMessage() : ""),
            "Could not upload video."
          )
        )
      );
    }
  } else if (payload.token) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) throw new Error("Could not start video upload.");
    const { error } = await supabase.storage
      .from(SPECIALIST_MEDIA_BUCKET)
      .uploadToSignedUrl(payload.path, payload.token, file, {
        contentType,
      });
    if (error) {
      throw new Error(videoUploadErrorMessage(error.message));
    }
  } else {
    throw new Error("Could not start video upload.");
  }

  return cacheBustUrl(payload.publicUrl);
}

/**
 * Dashboard specialist photo upload. Requires a specialist id when storage is live.
 * Without Supabase, returns the data URL so local mock sessions still work.
 */
export async function uploadSpecialistDashboardMedia(
  specialistId: string | null | undefined,
  dataUrl: string,
  kind: SpecialistDashboardMediaKind,
  onProgress?: UploadProgressHandler
): Promise<string> {
  const id = specialistId?.trim();
  if (!id) {
    throw new Error(
      "Could not upload — profile is not ready. Refresh and try again."
    );
  }
  if (!isMarketplaceSupabaseActive()) {
    onProgress?.(100);
    return dataUrl;
  }
  return postSpecialistApplicationMedia(
    dashboardMediaPath(id, kind),
    dataUrl,
    onProgress
  );
}
