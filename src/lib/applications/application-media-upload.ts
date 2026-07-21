/**
 * Replaces inline base64 data-URL media in a specialist application with
 * public storage URLs before the row is written to Supabase.
 *
 * Onboarding reads photos with FileReader (data URLs); embedding them in
 * `application_data` makes rows tens of MB and the upsert hits the Postgres
 * statement timeout. Files are uploaded through the server route
 * `/api/media/specialist-application` (service role — storage RLS does not
 * allow direct client uploads on the live project).
 */
import type { SpecialistApplication } from "@/types/specialist-application";

export type ApplicationMediaUploadResult =
  | { ok: true; application: SpecialistApplication }
  | { ok: false; message: string };

async function uploadDataUrl(dataUrl: string, path: string): Promise<string> {
  const response = await fetch("/api/media/specialist-application", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, dataUrl }),
  });
  const payload = (await response.json().catch(() => null)) as
    | { ok: boolean; publicUrl?: string; message?: string }
    | null;
  if (!response.ok || !payload?.ok || !payload.publicUrl) {
    throw new Error(payload?.message ?? `Upload failed (${response.status})`);
  }
  return payload.publicUrl;
}

/** Line-delimited URL fields (transformations, certifications, videos). */
async function uploadLineField(value: string, basePath: string): Promise<string> {
  if (!value.includes("data:")) return value;
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const out: string[] = [];
  let index = 0;
  for (const line of lines) {
    if (line.startsWith("data:")) {
      index += 1;
      out.push(await uploadDataUrl(line, `${basePath}-${index}`));
    } else {
      out.push(line);
    }
  }
  return out.join("\n");
}

function hasInlineMedia(application: SpecialistApplication): boolean {
  const media = application.media;
  return [
    media.profilePhotoUrl,
    media.profilePhotoOriginalUrl,
    media.transformationPhotoUrls,
    media.certificationUploadUrls,
    media.trainingVideoUrls,
  ].some((value) => typeof value === "string" && value.includes("data:"));
}

export async function uploadApplicationMediaToStorage(
  application: SpecialistApplication
): Promise<ApplicationMediaUploadResult> {
  if (!hasInlineMedia(application)) return { ok: true, application };

  const id = application.id;
  const media = { ...application.media };
  try {
    if (media.profilePhotoUrl.startsWith("data:")) {
      media.profilePhotoUrl = await uploadDataUrl(
        media.profilePhotoUrl,
        `${id}/profile/avatar`
      );
    }
    if (media.profilePhotoOriginalUrl.startsWith("data:")) {
      media.profilePhotoOriginalUrl = await uploadDataUrl(
        media.profilePhotoOriginalUrl,
        `${id}/profile/avatar-original`
      );
    }
    media.transformationPhotoUrls = await uploadLineField(
      media.transformationPhotoUrls,
      `${id}/gallery/transformation/image`
    );
    media.certificationUploadUrls = await uploadLineField(
      media.certificationUploadUrls,
      `${id}/gallery/certification/file`
    );
    media.trainingVideoUrls = await uploadLineField(
      media.trainingVideoUrls,
      `${id}/gallery/video/file`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload failed";
    return { ok: false, message: `Photo upload failed — ${message}` };
  }

  return { ok: true, application: { ...application, media } };
}
