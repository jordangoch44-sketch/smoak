/** Shared specialty chip display helpers for marketplace cards. */

export const DEFAULT_VISIBLE_SPECIALTIES = 2;
export const HOMEPAGE_FEATURED_SPECIALTY_LIMIT = 2;

export function getVisibleSpecialties(
  specialties: readonly string[] | null | undefined,
  maxVisible: number = DEFAULT_VISIBLE_SPECIALTIES
): { visible: string[]; extraCount: number } {
  const cleaned = (specialties ?? [])
    .map((s) => s.trim())
    .filter(Boolean);
  if (cleaned.length === 0) {
    return { visible: [], extraCount: 0 };
  }
  const visible = cleaned.slice(0, Math.max(0, maxVisible));
  return {
    visible,
    extraCount: Math.max(0, cleaned.length - visible.length),
  };
}

/**
 * Specialties shown on homepage sponsored/featured cards.
 * Uses explicit homepage picks when present; otherwise the first specialties.
 */
export function getHomepageFeaturedSpecialties(
  trainer: {
    specialty?: readonly string[] | null;
    homepageSpecialties?: readonly string[] | null;
  },
  max: number = HOMEPAGE_FEATURED_SPECIALTY_LIMIT
): string[] {
  const all = (trainer.specialty ?? []).map((s) => s.trim()).filter(Boolean);
  if (all.length === 0) return [];

  const featured = (trainer.homepageSpecialties ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => all.includes(s));

  if (featured.length > 0) {
    return featured.slice(0, max);
  }

  return all.slice(0, max);
}

/** Keep homepage picks in sync when the full specialty list changes. */
export function sanitizeHomepageSpecialties(
  specialties: readonly string[],
  homepageSpecialties: readonly string[] | null | undefined,
  max: number = HOMEPAGE_FEATURED_SPECIALTY_LIMIT
): string[] {
  const allowed = new Set(
    specialties.map((s) => s.trim()).filter(Boolean)
  );
  return (homepageSpecialties ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => allowed.has(s))
    .slice(0, max);
}
