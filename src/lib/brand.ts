/** Central SMOAC brand constants */
export const BRAND_NAME = "SMOAC";

/**
 * Official mark + wordmark (transparent PNGs).
 * Sources archived under `/public/brand/*-source.png`.
 * Bump query when swapping files if CDN caches stick.
 */
export const LOGO_SRC = "/smoac-mark.png";

/** Transparent raster wordmark — custom SMOAC letterforms (brand “font”) */
export const WORDMARK_SRC = "/smoac-wordmark.png";
export const WORDMARK_WIDTH = 978;
export const WORDMARK_HEIGHT = 177;

export type BrandWordmarkTone = "metallic" | "silver" | "white";
export type BrandWordmarkVariant = "primary" | "compact" | "display";

/**
 * SMOAC Color — primary multi-spectrum brand (CSS: `--smoac-color`).
 * Warm → rose → violet → indigo → cool. Prefer over flat purple.
 */
export const SMOAC_COLOR = {
  warm: "#ff6b4a",
  rose: "#f472b6",
  violet: "#a855f7",
  indigo: "#818cf8",
  cool: "#7dd3fc",
  /** CSS custom property for the full gradient */
  cssVar: "var(--smoac-color)",
} as const;
