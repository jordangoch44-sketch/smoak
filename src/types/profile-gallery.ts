/** Normalized gallery item for profile hero + fullscreen viewer */
export interface ProfileGalleryMedia {
  id: string;
  type: "image" | "video";
  url: string;
  thumbnail?: string;
  alt?: string;
}
