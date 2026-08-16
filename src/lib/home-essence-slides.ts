/**
 * Marketplace hero essence strip — swap `src` when real brand photos arrive.
 * Keep wide 16:9 (or wider) lifestyle frames; no on-image copy.
 */
export type HomeEssenceSlide = {
  id: string;
  src: string;
  alt: string;
};

export const HOME_ESSENCE_SLIDES: readonly HomeEssenceSlide[] = [
  {
    id: "training",
    src: "/home/essence/home-essence-01.jpg",
    alt: "Specialist coaching a client outdoors",
  },
  {
    id: "yoga",
    src: "/home/essence/home-essence-02.jpg",
    alt: "Morning wellness session on a sunlit deck",
  },
  {
    id: "nutrition",
    src: "/home/essence/home-essence-03.jpg",
    alt: "Nutrition guidance in a bright kitchen",
  },
  {
    id: "mobility",
    src: "/home/essence/home-essence-04.jpg",
    alt: "Mobility work in a calm studio",
  },
] as const;

/** Auto-advance interval for the essence strip */
export const HOME_ESSENCE_INTERVAL_MS = 5200;
