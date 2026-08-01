import type { ProfileGalleryMedia } from "@/types/profile-gallery";
import type { Trainer, TrainerMediaItem } from "@/types/trainer";

export type { ProfileGalleryMedia };

/** Image URLs for the profile hero slideshow */
export function buildTrainerGalleryImages(
  gallery: TrainerMediaItem[],
  heroImage: string,
  explicit?: string[]
): string[] {
  if (explicit && explicit.length > 0) return explicit;

  const fromGallery = gallery
    .filter((item) => item.type === "image")
    .map((item) => item.src)
    .filter(Boolean);

  if (fromGallery.length > 0) return fromGallery;
  return heroImage ? [heroImage] : [];
}

export function getProfileGalleryMedia(
  gallery: TrainerMediaItem[],
  galleryImages: string[],
  heroImage: string
): ProfileGalleryMedia[] {
  if (gallery.length > 0) {
    return gallery
      .filter((item) => typeof item.src === "string" && item.src.trim().length > 0)
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

  const images = (
    galleryImages.length > 0 ? galleryImages : heroImage ? [heroImage] : []
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

export function syncTrainerGalleryImages(trainer: Trainer): Trainer {
  const galleryImages = buildTrainerGalleryImages(
    trainer.gallery,
    trainer.heroImage,
    trainer.galleryImages
  );
  return { ...trainer, galleryImages };
}
