/**
 * Marketplace homepage essence strip — editable via Admin → Settings.
 * Defaults seed the rail until a live config is saved.
 */

export type HomeEssenceSlide = {
  id: string;
  src: string;
  alt: string;
  /** When false, slide is hidden on the marketplace */
  enabled: boolean;
  /** Lower = earlier in the carousel */
  sortOrder: number;
};

export type HomeEssenceConfig = {
  /** Auto-advance duration in milliseconds */
  intervalMs: number;
  slides: HomeEssenceSlide[];
};

export const HOME_ESSENCE_DEFAULT_INTERVAL_MS = 5200;

export const HOME_ESSENCE_INTERVAL_MS_MIN = 2500;
export const HOME_ESSENCE_INTERVAL_MS_MAX = 20000;

/** Storage object path for the live JSON config (specialist-media bucket). */
export const HOME_ESSENCE_CONFIG_STORAGE_PATH =
  "site/homepage-essence/config.json";

export const DEFAULT_HOME_ESSENCE_SLIDES: readonly HomeEssenceSlide[] = [
  {
    id: "plank",
    src: "/home/essence/home-essence-01.png",
    alt: "SMOAC — Fitness Anywhere",
    enabled: true,
    sortOrder: 0,
  },
  {
    id: "compare",
    src: "/home/essence/home-essence-02.png",
    alt: "Find the perfect fit on SMOAC",
    enabled: true,
    sortOrder: 1,
  },
  {
    id: "search",
    src: "/home/essence/home-essence-03.png",
    alt: "Search specialists near you on SMOAC",
    enabled: true,
    sortOrder: 2,
  },
  {
    id: "yoga",
    src: "/home/essence/home-essence-04.png",
    alt: "Outdoor fitness with SMOAC",
    enabled: true,
    sortOrder: 3,
  },
  {
    id: "crew",
    src: "/home/essence/home-essence-05.png",
    alt: "Train anywhere with SMOAC",
    enabled: true,
    sortOrder: 4,
  },
] as const;

export function getDefaultHomeEssenceConfig(): HomeEssenceConfig {
  return {
    intervalMs: HOME_ESSENCE_DEFAULT_INTERVAL_MS,
    slides: DEFAULT_HOME_ESSENCE_SLIDES.map((slide) => ({ ...slide })),
  };
}

/** @deprecated Prefer getDefaultHomeEssenceConfig().slides — kept for imports. */
export const HOME_ESSENCE_SLIDES = DEFAULT_HOME_ESSENCE_SLIDES;

/** @deprecated Prefer config.intervalMs */
export const HOME_ESSENCE_INTERVAL_MS = HOME_ESSENCE_DEFAULT_INTERVAL_MS;

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function clampHomeEssenceIntervalMs(ms: number): number {
  const rounded = Math.round(ms);
  return Math.min(
    HOME_ESSENCE_INTERVAL_MS_MAX,
    Math.max(HOME_ESSENCE_INTERVAL_MS_MIN, rounded)
  );
}

export function normalizeHomeEssenceConfig(
  raw: unknown
): HomeEssenceConfig {
  const defaults = getDefaultHomeEssenceConfig();
  if (!raw || typeof raw !== "object") return defaults;

  const record = raw as Record<string, unknown>;
  const intervalMs = clampHomeEssenceIntervalMs(
    asFiniteNumber(record.intervalMs, defaults.intervalMs)
  );

  const rawSlides = Array.isArray(record.slides) ? record.slides : [];
  const slides: HomeEssenceSlide[] = [];

  for (let i = 0; i < rawSlides.length; i += 1) {
    const item = rawSlides[i];
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const src = asString(row.src).trim();
    if (!src) continue;
    const id =
      asString(row.id).trim() ||
      `slide-${i}-${Math.random().toString(36).slice(2, 8)}`;
    slides.push({
      id,
      src,
      alt: asString(row.alt, "SMOAC").trim() || "SMOAC",
      enabled: asBool(row.enabled, true),
      sortOrder: asFiniteNumber(row.sortOrder, i),
    });
  }

  if (slides.length === 0) {
    return { intervalMs, slides: defaults.slides };
  }

  slides.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  return {
    intervalMs,
    slides: slides.map((slide, index) => ({ ...slide, sortOrder: index })),
  };
}

/** Enabled slides in display order for the public carousel. */
export function listActiveHomeEssenceSlides(
  config: HomeEssenceConfig
): HomeEssenceSlide[] {
  return config.slides
    .filter((slide) => slide.enabled && slide.src.trim())
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}
