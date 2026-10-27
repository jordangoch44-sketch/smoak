/**
 * Replaces inline base64 data-URL media in a specialist application with
 * public storage URLs before the row is written to Supabase.
 *
 * Onboarding reads photos with FileReader (data URLs); embedding them in
 * `application_data` makes rows tens of MB and the upsert hits the Postgres
 * statement timeout. The browser uploads each file to a signed storage URL
 * from `/api/media/specialist-application` (service role — storage RLS does
 * not allow a plain client upload on the live project).
 */
import { postSpecialistApplicationMedia } from "@/lib/media/specialist-media-upload";
import {
  dataUrlByteLength,
  weightedUploadPercent,
  type UploadProgressHandler,
} from "@/lib/media/upload-progress";
import type { SpecialistApplication } from "@/types/specialist-application";

export type ApplicationMediaUploadResult =
  | { ok: true; application: SpecialistApplication }
  | { ok: false; message: string };

function inlineByteSize(value: string | undefined): number {
  if (!value?.includes("data:")) return 0;
  return value.split("\n").reduce((sum, line) => {
    const trimmed = line.trim();
    return trimmed.startsWith("data:") ? sum + dataUrlByteLength(trimmed) : sum;
  }, 0);
}

/** Line-delimited URL fields (client results, certifications, videos). */
async function uploadLineField(
  value: string,
  basePath: string,
  post: (path: string, dataUrl: string) => Promise<string>
): Promise<string> {
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
      out.push(await post(`${basePath}-${index}`, line));
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
  application: SpecialistApplication,
  onProgress?: UploadProgressHandler
): Promise<ApplicationMediaUploadResult> {
  if (!hasInlineMedia(application)) return { ok: true, application };

  const id = application.id;
  const media = { ...application.media };
  const stamp = Date.now().toString(36);
  const totalBytes =
    inlineByteSize(media.profilePhotoUrl) +
    inlineByteSize(media.profilePhotoOriginalUrl) +
    inlineByteSize(media.transformationPhotoUrls) +
    inlineByteSize(media.certificationUploadUrls) +
    inlineByteSize(media.trainingVideoUrls);
  let uploadedBytes = 0;
  const post = async (path: string, dataUrl: string) => {
    const size = Math.max(1, dataUrlByteLength(dataUrl));
    const start = uploadedBytes;
    const url = await postSpecialistApplicationMedia(path, dataUrl, (percent) => {
      if (totalBytes <= 0) return;
      const next = weightedUploadPercent([
        { weight: start, percent: 100 },
        { weight: size, percent },
        { weight: Math.max(0, totalBytes - start - size), percent: 0 },
      ]);
      if (next != null) onProgress?.(next);
    });
    uploadedBytes += size;
    if (totalBytes > 0) {
      onProgress?.(
        Math.max(0, Math.min(100, Math.round((uploadedBytes / totalBytes) * 100)))
      );
    }
    return url;
  };
  try {
    if (media.profilePhotoUrl.startsWith("data:")) {
      media.profilePhotoUrl = await post(
        `${id}/profile/avatar-${stamp}`,
        media.profilePhotoUrl
      );
    }
    if (media.profilePhotoOriginalUrl.startsWith("data:")) {
      media.profilePhotoOriginalUrl = await post(
        `${id}/profile/avatar-original-${stamp}`,
        media.profilePhotoOriginalUrl
      );
    }
    media.transformationPhotoUrls = await uploadLineField(
      media.transformationPhotoUrls,
      `${id}/gallery/transformation/image`,
      post
    );
    media.certificationUploadUrls = await uploadLineField(
      media.certificationUploadUrls,
      `${id}/gallery/certification/file`,
      post
    );
    media.trainingVideoUrls = await uploadLineField(
      media.trainingVideoUrls,
      `${id}/gallery/video/file`,
      post
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload failed";
    return { ok: false, message: `Photo upload failed — ${message}` };
  }

  return { ok: true, application: { ...application, media } };
}
