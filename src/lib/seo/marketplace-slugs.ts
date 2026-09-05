import { MARKETPLACE_CITIES, type MarketplaceCity } from "@/data/locations";
import { MAIN_PROFESSION_CATEGORIES, type MainProfession } from "@/data/professions";

/** URL slug for a marketplace city, e.g. "San Diego" → "san-diego". */
export function cityToSlug(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugToCity(slug: string): MarketplaceCity | null {
  const normalized = slug.trim().toLowerCase();
  for (const city of MARKETPLACE_CITIES) {
    if (cityToSlug(city) === normalized) return city;
  }
  return null;
}

export type MarketplaceProfessionLanding = {
  slug: string;
  profession: MainProfession;
  pluralLabel: string;
  singularLabel: string;
  /** Natural-language phrase for meta copy, e.g. "personal training" */
  searchPhrase: string;
};

function landing(
  slug: string,
  profession: MainProfession,
  searchPhrase: string
): MarketplaceProfessionLanding {
  return {
    slug,
    profession,
    pluralLabel: profession,
    singularLabel: profession,
    searchPhrase,
  };
}

/** Profession landing pages — canonical slugs for SEO URLs. */
export const MARKETPLACE_PROFESSION_LANDINGS: readonly MarketplaceProfessionLanding[] =
  [
    landing("personal-training", "Personal Training", "personal training"),
    landing("physical-therapy", "Physical Therapy", "physical therapy"),
    landing("massage-therapy", "Massage Therapy", "massage therapy"),
    landing("bodywork", "Bodywork", "bodywork"),
    landing("chiropractic", "Chiropractic", "chiropractic care"),
    landing(
      "nutrition-dietetics",
      "Nutrition & Dietetics",
      "nutrition and dietetics"
    ),
    landing("yoga", "Yoga", "yoga"),
    landing("pilates", "Pilates", "pilates"),
    landing(
      "mental-health-therapy",
      "Mental Health & Therapy",
      "mental health and therapy"
    ),
    landing(
      "medical-iv-wellness",
      "Medical & IV Wellness",
      "medical and IV wellness"
    ),
    landing(
      "sports-endurance-coaching",
      "Sports/Endurance Coaching",
      "sports and endurance coaching"
    ),
  ] as const;

/** Legacy SEO slugs → canonical landing slug. */
const PROFESSION_SLUG_ALIASES: Record<string, string> = {
  "personal-trainers": "personal-training",
  "strength-coaches": "sports-endurance-coaching",
  "physical-therapists": "physical-therapy",
  chiropractors: "chiropractic",
  nutritionists: "nutrition-dietetics",
  "massage-therapists": "massage-therapy",
  "recovery-specialists": "bodywork",
  "wellness-coaches": "mental-health-therapy",
  "yoga-instructors": "yoga",
  "running-coaches": "sports-endurance-coaching",
};

export function slugToProfessionLanding(
  slug: string
): MarketplaceProfessionLanding | null {
  const normalized = slug.trim().toLowerCase();
  const canonical = PROFESSION_SLUG_ALIASES[normalized] ?? normalized;
  return (
    MARKETPLACE_PROFESSION_LANDINGS.find((entry) => entry.slug === canonical) ??
    null
  );
}

export function listMarketplaceCitySlugs(): string[] {
  return MARKETPLACE_CITIES.map(cityToSlug);
}

export function listMarketplaceLandingPaths(): Array<{
  citySlug: string;
  professionSlug: string;
}> {
  const paths: Array<{ citySlug: string; professionSlug: string }> = [];
  for (const city of MARKETPLACE_CITIES) {
    const citySlug = cityToSlug(city);
    for (const profession of MARKETPLACE_PROFESSION_LANDINGS) {
      paths.push({ citySlug, professionSlug: profession.slug });
    }
  }
  return paths;
}

export function findPathForProfession(
  profession: string
): MarketplaceProfessionLanding | null {
  const key = profession.trim().toLowerCase();
  return (
    MARKETPLACE_PROFESSION_LANDINGS.find(
      (entry) => entry.profession.toLowerCase() === key
    ) ?? null
  );
}

/** All canonical profession categories have a landing definition. */
export function assertProfessionLandingsComplete(): void {
  for (const profession of MAIN_PROFESSION_CATEGORIES) {
    if (!findPathForProfession(profession)) {
      throw new Error(`Missing marketplace landing slug for ${profession}`);
    }
  }
}
