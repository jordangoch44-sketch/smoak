import type { ProfileGalleryMedia } from "@/types/profile-gallery";
import type { Trainer, TrainerMediaItem } from "@/types/trainer";

export type { ProfileGalleryMedia };

/** Image URLs for the profile hero slideshow */
export function buildTrainerGalleryImages(
  gallery: TrainerMediaItem[] | null | undefined,
  heroImage: string,
  explicit?: string[] | null
): string[] {
  if (explicit && explicit.length > 0) return explicit;

  const list = Array.isArray(gallery) ? gallery : [];
  const fromGallery = list
    .filter((item) => item?.type === "image")
    .map((item) => item.src)
    .filter(Boolean);

  if (fromGallery.length > 0) return fromGallery;
  return heroImage ? [heroImage] : [];
}

export function getProfileGalleryMedia(
  gallery: TrainerMediaItem[] | null | undefined,
  galleryImages: string[] | null | undefined,
  heroImage: string
): ProfileGalleryMedia[] {
  const list = Array.isArray(gallery) ? gallery : [];
  if (list.length > 0) {
    return list
      .filter((item) => typeof item?.src === "string" && item.src.trim().length > 0)
      .map((item) => ({
        id: item.id,
        type: item.type,
        url: item.src.trim(),
        thumbnail:
          item.type === "video"
            ? (item.poster ?? item.src).trim()
            : item.src.trim(),
        alt: item.alt,
      }));
  }

  const explicitImages = Array.isArray(galleryImages) ? galleryImages : [];
  const images = (
    explicitImages.length > 0 ? explicitImages : heroImage ? [heroImage] : []
  ).filter((url) => typeof url === "string" && url.trim().length > 0);

  return images.map((url, index) => ({
    id: `gallery-image-${index}`,
    type: "image" as const,
    url: url.trim(),
    thumbnail: url.trim(),
    alt: "Gallery photo",
  }));
}

export function resolveGalleryIndexForCover(
  media: ProfileGalleryMedia[],
  coverImages: string[],
  coverIndex: number
): number {
  const coverUrl = coverImages[coverIndex];
  if (!coverUrl) return 0;

  const match = media.findIndex(
    (item) => item.url === coverUrl || item.thumbnail === coverUrl
  );
  return match >= 0 ? match : 0;
}

export function resolveGalleryIndexForUrl(
  media: ProfileGalleryMedia[],
  url: string
): number {
  const trimmed = url.trim();
  if (!trimmed) return 0;
  const match = media.findIndex(
    (item) => item.url === trimmed || item.thumbnail === trimmed
  );
  return match >= 0 ? match : 0;
}

/** Remaining gallery images not shown in the Pro pinned row. */
export function countExtraGalleryPhotos(
  media: ProfileGalleryMedia[],
  pinnedPhotos: readonly string[]
): number {
  if (pinnedPhotos.length === 0) return 0;
  const pinned = new Set(pinnedPhotos);
  return media.filter((item) => {
    if (item.type !== "image") return false;
    const url = item.url.trim();
    const thumb = item.thumbnail?.trim() ?? "";
    return !pinned.has(url) && (!thumb || !pinned.has(thumb));
  }).length;
}

export function syncTrainerGalleryImages(trainer: Trainer): Trainer {
  const galleryImages = buildTrainerGalleryImages(
    trainer.gallery,
    trainer.heroImage,
    trainer.galleryImages
  );
  return { ...trainer, galleryImages };
}
