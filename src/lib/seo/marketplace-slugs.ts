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

/** Profession landing pages — plural slugs for SEO URLs. */
export const MARKETPLACE_PROFESSION_LANDINGS: readonly MarketplaceProfessionLanding[] =
  [
    {
      slug: "personal-trainers",
      profession: "Personal Trainer",
      pluralLabel: "Personal Trainers",
      singularLabel: "Personal Trainer",
      searchPhrase: "personal training",
    },
    {
      slug: "strength-coaches",
      profession: "Strength Coach",
      pluralLabel: "Strength Coaches",
      singularLabel: "Strength Coach",
      searchPhrase: "strength coaching",
    },
    {
      slug: "physical-therapists",
      profession: "Physical Therapist",
      pluralLabel: "Physical Therapists",
      singularLabel: "Physical Therapist",
      searchPhrase: "physical therapy",
    },
    {
      slug: "chiropractors",
      profession: "Chiropractor",
      pluralLabel: "Chiropractors",
      singularLabel: "Chiropractor",
      searchPhrase: "chiropractic care",
    },
    {
      slug: "nutritionists",
      profession: "Nutritionist",
      pluralLabel: "Nutritionists",
      singularLabel: "Nutritionist",
      searchPhrase: "nutrition coaching",
    },
    {
      slug: "massage-therapists",
      profession: "Massage Therapist",
      pluralLabel: "Massage Therapists",
      singularLabel: "Massage Therapist",
      searchPhrase: "massage therapy",
    },
    {
      slug: "recovery-specialists",
      profession: "Recovery Specialist",
      pluralLabel: "Recovery Specialists",
      singularLabel: "Recovery Specialist",
      searchPhrase: "recovery and rehab",
    },
    {
      slug: "wellness-coaches",
      profession: "Wellness Coach",
      pluralLabel: "Wellness Coaches",
      singularLabel: "Wellness Coach",
      searchPhrase: "wellness coaching",
    },
    {
      slug: "yoga-instructors",
      profession: "Yoga Instructor",
      pluralLabel: "Yoga Instructors",
      singularLabel: "Yoga Instructor",
      searchPhrase: "yoga instruction",
    },
    {
      slug: "running-coaches",
      profession: "Running Coach",
      pluralLabel: "Running Coaches",
      singularLabel: "Running Coach",
      searchPhrase: "running coaching",
    },
  ] as const;

export function slugToProfessionLanding(
  slug: string
): MarketplaceProfessionLanding | null {
  const normalized = slug.trim().toLowerCase();
  return (
    MARKETPLACE_PROFESSION_LANDINGS.find((entry) => entry.slug === normalized) ??
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
