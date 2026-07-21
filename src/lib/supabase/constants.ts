/** Public bucket for client (and shared) account avatars */
export const AVATARS_BUCKET = "avatars" as const;

export const CLIENT_AVATAR_STORAGE_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
} as const;

/** Public bucket for specialist profile & gallery assets */
export const SPECIALIST_MEDIA_BUCKET = "specialist-media" as const;

/** Max upload sizes (bytes) — enforce in UI before calling storage helpers */
export const SPECIALIST_STORAGE_LIMITS = {
  profile: 5 * 1024 * 1024,
  cover: 8 * 1024 * 1024,
  galleryImage: 8 * 1024 * 1024,
  galleryVideo: 100 * 1024 * 1024,
  galleryVideoPoster: 3 * 1024 * 1024,
} as const;

export const SPECIALIST_STORAGE_ACCEPT = {
  profile: "image/jpeg,image/png,image/webp",
  cover: "image/jpeg,image/png,image/webp",
  galleryImage: "image/jpeg,image/png,image/webp",
  galleryVideo: "video/mp4,video/quicktime,video/webm",
  galleryVideoPoster: "image/jpeg,image/png,image/webp",
} as const;
