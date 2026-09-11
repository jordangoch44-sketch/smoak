/** Shared specialty chip display helpers for marketplace cards. */

import { marketplaceSpecialtyOptions } from "@/data/marketplace-specialties";

export const DEFAULT_VISIBLE_SPECIALTIES = 3;
export const HOMEPAGE_FEATURED_SPECIALTY_LIMIT = 3;

const MARKETPLACE_SPECIALTY_SET = new Set<string>(marketplaceSpecialtyOptions);

/** Keep only canonical marketplace specialty tags. */
export function sanitizeMarketplaceSpecialties(
  specialties: readonly string[] | null | undefined
): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const raw of specialties ?? []) {
    const value = raw.trim();
    if (!value || !MARKETPLACE_SPECIALTY_SET.has(value) || seen.has(value)) {
      continue;
    }
    seen.add(value);
    next.push(value);
  }
  return next;
}

/** First N selections — shown on marketplace cards. */
export function featuredSpecialtiesFromSelection(
  specialties: readonly string[],
  max: number = HOMEPAGE_FEATURED_SPECIALTY_LIMIT
): string[] {
  return sanitizeMarketplaceSpecialties(specialties).slice(0, max);
}

/**
 * Pin explicitly featured specialties to the front of a picker grid.
 * Extra options stay in catalog order below.
 */
export function orderSpecialtyPickerOptions(
  options: readonly string[],
  selected: readonly string[],
  featuredLimit: number = HOMEPAGE_FEATURED_SPECIALTY_LIMIT,
  homepageSpecialties?: readonly string[] | null
): string[] {
  const featured = sanitizeHomepageSpecialties(
    selected,
    homepageSpecialties,
    featuredLimit
  );
  const featuredSet = new Set(featured);
  const rest = options.filter((option) => !featuredSet.has(option));
  return [...featured, ...rest];
}

export function getVisibleSpecialties(
  specialties: readonly string[] | null | undefined,
  maxVisible: number = DEFAULT_VISIBLE_SPECIALTIES
): { visible: string[]; extraCount: number } {
  const cleaned = sanitizeMarketplaceSpecialties(specialties);
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
  const all = sanitizeMarketplaceSpecialties(trainer.specialty);
  if (all.length === 0) return [];

  const featured = sanitizeHomepageSpecialties(
    all,
    trainer.homepageSpecialties,
    max
  );

  if (featured.length > 0) {
    return featured;
  }

  return all.slice(0, max);
}

/** Keep homepage picks in sync when the full specialty list changes. */
export function sanitizeHomepageSpecialties(
  specialties: readonly string[],
  homepageSpecialties: readonly string[] | null | undefined,
  max: number = HOMEPAGE_FEATURED_SPECIALTY_LIMIT
): string[] {
  const allowed = new Set(sanitizeMarketplaceSpecialties(specialties));
  return (homepageSpecialties ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => allowed.has(s))
    .filter((s, index, list) => list.indexOf(s) === index)
    .slice(0, max);
}

/** Keep valid featured picks. Empty means the card will use the first specialties. */
export function syncHomepageSpecialties(
  specialties: readonly string[],
  homepageSpecialties?: readonly string[] | null,
  max: number = HOMEPAGE_FEATURED_SPECIALTY_LIMIT
): string[] {
  return sanitizeHomepageSpecialties(
    sanitizeMarketplaceSpecialties(specialties),
    homepageSpecialties,
    max
  );
}

/**
 * Gray → specialty → featured on marketplace card → gray.
 * A fourth featured pick replaces the oldest featured (still kept as a specialty).
 */
export function toggleMarketplaceSpecialty(
  specialty: string,
  selected: readonly string[],
  homepageSpecialties?: readonly string[] | null
): { specialty: string[]; homepageSpecialties: string[] } {
  const current = sanitizeMarketplaceSpecialties(selected);
  const featured = sanitizeHomepageSpecialties(current, homepageSpecialties);
  if (!MARKETPLACE_SPECIALTY_SET.has(specialty)) {
    return { specialty: current, homepageSpecialties: featured };
  }

  const isSelected = current.includes(specialty);
  const isFeatured = featured.includes(specialty);

  if (!isSelected) {
    const next = [...current, specialty];
    return {
      specialty: next,
      homepageSpecialties: sanitizeHomepageSpecialties(next, featured),
    };
  }

  if (!isFeatured) {
    return {
      specialty: current,
      homepageSpecialties: [...featured, specialty].slice(
        -HOMEPAGE_FEATURED_SPECIALTY_LIMIT
      ),
    };
  }

  const next = current.filter((item) => item !== specialty);
  return {
    specialty: next,
    homepageSpecialties: sanitizeHomepageSpecialties(next, featured),
  };
}

export function withSanitizedMarketplaceSpecialties<
  T extends {
    specialty?: string[] | null;
    homepageSpecialties?: string[] | null;
  },
>(trainer: T): T {
  const specialty = sanitizeMarketplaceSpecialties(trainer.specialty);
  const homepageSpecialties = syncHomepageSpecialties(
    specialty,
    trainer.homepageSpecialties
  );
  const next = { ...trainer, specialty };
  if (homepageSpecialties.length > 0) {
    next.homepageSpecialties = homepageSpecialties;
  } else {
    delete (next as { homepageSpecialties?: string[] }).homepageSpecialties;
  }
  return next;
}
