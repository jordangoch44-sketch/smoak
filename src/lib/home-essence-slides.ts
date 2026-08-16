/**
 * Marketplace hero essence strip — brand campaign stills.
 * Wide frames; creatives already include logo/copy where needed.
 */
export type HomeEssenceSlide = {
  id: string;
  src: string;
  alt: string;
};

export const HOME_ESSENCE_SLIDES: readonly HomeEssenceSlide[] = [
  {
    id: "plank",
    src: "/home/essence/home-essence-01.png",
    alt: "SMOAC — Fitness Anywhere",
  },
  {
    id: "compare",
    src: "/home/essence/home-essence-02.png",
    alt: "Find the perfect fit on SMOAC",
  },
  {
    id: "search",
    src: "/home/essence/home-essence-03.png",
    alt: "Search specialists near you on SMOAC",
  },
  {
    id: "yoga",
    src: "/home/essence/home-essence-04.png",
    alt: "Outdoor fitness with SMOAC",
  },
  {
    id: "crew",
    src: "/home/essence/home-essence-05.png",
    alt: "Train anywhere with SMOAC",
  },
] as const;

/** Auto-advance interval for the essence strip */
export const HOME_ESSENCE_INTERVAL_MS = 5200;
