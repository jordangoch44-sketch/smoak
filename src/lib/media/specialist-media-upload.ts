import { isMarketplaceSupabaseActive } from "@/lib/auth/marketplace-auth";

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
