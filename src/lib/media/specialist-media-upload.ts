import { isMarketplaceSupabaseActive } from "@/lib/auth/marketplace-auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SPECIALIST_MEDIA_BUCKET } from "@/lib/supabase/constants";
import { resolveVideoContentType } from "@/lib/media/video-file";

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

/** POST a data URL to `/api/media/specialist-application` and cache-bust the public URL. */
export async function postSpecialistApplicationMedia(
  path: string,
  dataUrl: string
): Promise<string> {
  const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const response = await fetch("/api/media/specialist-application", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, dataUrl }),
  });
  const payload = (await response.json().catch(() => null)) as
    | { ok: boolean; publicUrl?: string; message?: string }
    | null;
  if (!response.ok || !payload?.ok || !payload.publicUrl) {
    throw new Error(
      payload?.message ??
        (response.status === 413
          ? "Photo is too large to upload."
          : response.status === 401
            ? "Sign in again to upload photos."
            : "Could not upload image.")
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

/**
 * Upload a phone video via signed URL (not a data URL — clips are too large).
 */
export async function uploadSpecialistDashboardVideo(
  specialistId: string | null | undefined,
  file: File
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
      payload?.message ??
        (response.status === 401
          ? "Sign in again to upload videos."
          : "Could not start video upload.")
    );
  }

  const supabase = createSupabaseBrowserClient();
  if (supabase && payload.token) {
    const { error } = await supabase.storage
      .from(SPECIALIST_MEDIA_BUCKET)
      .uploadToSignedUrl(payload.path, payload.token, file, {
        contentType,
      });
    if (error) {
      throw new Error(error.message || "Could not upload video.");
    }
  } else if (payload.signedUrl) {
    const put = await fetch(payload.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: file,
    });
    if (!put.ok) {
      throw new Error("Could not upload video.");
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
  kind: SpecialistDashboardMediaKind
): Promise<string> {
  const id = specialistId?.trim();
  if (!id) {
    throw new Error(
      "Could not upload — profile is not ready. Refresh and try again."
    );
  }
  if (!isMarketplaceSupabaseActive()) return dataUrl;
  return postSpecialistApplicationMedia(
    dashboardMediaPath(id, kind),
    dataUrl
  );
}
