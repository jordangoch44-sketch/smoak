/**
 * Natural-language search → filter mappings.
 * TODO(provider-onboarding): extend from provider taxonomy + onboarding synonyms.
 */

import { CITY_NEIGHBORHOODS, MARKETPLACE_CITIES } from "@/data/locations";
import { marketplaceSpecialtyOptions } from "@/data/marketplace-specialties";
import { MAIN_PROFESSION_CATEGORIES } from "@/data/professions";

export const SEARCH_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "into",
  "near",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "within",
  "around",
  "looking",
  "find",
  "need",
  "want",
  "me",
  "my",
]);

export type SearchMappingKind = "city" | "neighborhood" | "profession" | "specialty";

export interface SearchMappingEntry {
  /** Normalized lowercase phrase to match in query */
  phrase: string;
  kind: SearchMappingKind;
  label: string;
  city?: string;
  neighborhood?: string;
  profession?: string;
  specialty?: string;
}

function neighborhoodEntries(): SearchMappingEntry[] {
  const entries: SearchMappingEntry[] = [];
  for (const city of MARKETPLACE_CITIES) {
    const neighborhoods = CITY_NEIGHBORHOODS[city] ?? [];
    for (const neighborhood of neighborhoods) {
      entries.push({
        phrase: neighborhood.toLowerCase(),
        kind: "neighborhood",
        label: neighborhood,
        city,
        neighborhood,
      });
    }
  }
  return entries;
}

/** Major markets recognized in natural-language search (includes non-seed cities) */
export const SEARCH_MARKET_CITIES = [
  "San Diego",
  "Los Angeles",
  "Austin",
  "San Francisco",
  "New York",
  "Miami",
  "Dallas",
  "Chicago",
  "Phoenix",
  "Las Vegas",
  "Orange County",
  "Riverside",
  "Temecula",
  "Chula Vista",
  "Oceanside",
  "Carlsbad",
  "Encinitas",
  "Escondido",
] as const;

function cityEntries(): SearchMappingEntry[] {
  const seen = new Set<string>();
  const entries: SearchMappingEntry[] = [];

  for (const city of SEARCH_MARKET_CITIES) {
    if (seen.has(city)) continue;
    seen.add(city);
    entries.push({
      phrase: city.toLowerCase(),
      kind: "city",
      label: city,
      city,
    });
  }

  return entries;
}

/** Profession aliases → canonical main profession (must match MAIN_PROFESSION_CATEGORIES) */
const PROFESSION_MAPPINGS: {
  phrases: string[];
  profession: string;
  label: string;
}[] = [
  {
    phrases: ["physical therapist", "physiotherapist", "physical therapy"],
    profession: "Physical Therapist",
    label: "Physical Therapist",
  },
  {
    phrases: ["chiropractor", "chiropractic"],
    profession: "Chiropractor",
    label: "Chiropractor",
  },
  {
    phrases: [
      "nutrition coach",
      "nutritionist",
      "nutrition",
      "dietitian",
      "diet coach",
    ],
    profession: "Nutritionist",
    label: "Nutritionist",
  },
  {
    phrases: ["recovery specialist", "recovery coach"],
    profession: "Recovery Specialist",
    label: "Recovery Specialist",
  },
  {
    phrases: ["massage therapist", "licensed massage therapist", "lmt", "massage"],
    profession: "Massage Therapist",
    label: "Massage Therapist",
  },
  {
    phrases: [
      "personal trainer",
      "personal training",
      "fitness coach",
      "sports performance coach",
      "performance coach",
    ],
    profession: "Personal Trainer",
    label: "Personal Trainer",
  },
  {
    phrases: ["strength coach", "strength coaching"],
    profession: "Strength Coach",
    label: "Strength Coach",
  },
  {
    phrases: ["wellness coach", "wellness coaching", "mobility specialist", "movement specialist"],
    profession: "Wellness Coach",
    label: "Wellness Coach",
  },
  {
    phrases: ["yoga instructor", "yoga teacher", "yoga"],
    profession: "Yoga Instructor",
    label: "Yoga Instructor",
  },
  {
    phrases: [
      "running coach",
      "run coach",
      "marathon coach",
      "endurance coach",
    ],
    profession: "Running Coach",
    label: "Running Coach",
  },
];

/** Specialty aliases → filter specialty value */
const SPECIALTY_MAPPINGS: {
  phrases: string[];
  specialty: string;
  label: string;
}[] = [
  {
    phrases: ["sports rehab", "sports rehabilitation", "rehab"],
    specialty: "Corrective Exercise",
    label: "Sports Rehab",
  },
  { phrases: ["mobility", "flexibility", "back pain", "posture"], specialty: "Mobility", label: "Mobility" },
  { phrases: ["weight loss", "fat loss", "lose weight"], specialty: "Weight Loss", label: "Weight Loss" },
  { phrases: ["strength training", "strength coaching", "strength"], specialty: "Strength Coaching", label: "Strength Coaching" },
  { phrases: ["nutrition coaching", "meal planning"], specialty: "Nutrition Coaching", label: "Nutrition Coaching" },
  { phrases: ["recovery", "soft tissue"], specialty: "Recovery", label: "Recovery" },
  { phrases: ["sports performance", "athletic performance"], specialty: "Sports Performance", label: "Sports Performance" },
  { phrases: ["athletic development"], specialty: "Athletic Development", label: "Athletic Development" },
  { phrases: ["hyrox"], specialty: "HYROX", label: "HYROX" },
  { phrases: ["boxing", "boxer"], specialty: "Boxing", label: "Boxing" },
  { phrases: ["women's health", "womens health", "women health"], specialty: "Women's Health", label: "Women's Health" },
  { phrases: ["senior fitness", "senior training"], specialty: "Senior Fitness", label: "Senior Fitness" },
  { phrases: ["corrective exercise"], specialty: "Corrective Exercise", label: "Corrective Exercise" },
  { phrases: ["yoga"], specialty: "Yoga", label: "Yoga" },
  {
    phrases: [
      "running coach",
      "run coach",
      "running",
      "marathon coach",
      "endurance coach",
    ],
    specialty: "Sports Performance",
    label: "Running Coach",
  },
];

function professionEntries(): SearchMappingEntry[] {
  const allowed = new Set<string>(MAIN_PROFESSION_CATEGORIES);
  const entries: SearchMappingEntry[] = [];
  for (const m of PROFESSION_MAPPINGS) {
    if (!allowed.has(m.profession)) continue;
    for (const phrase of m.phrases) {
      entries.push({
        phrase,
        kind: "profession",
        label: m.label,
        profession: m.profession,
      });
    }
  }
  return entries;
}

function specialtyEntries(): SearchMappingEntry[] {
  const entries: SearchMappingEntry[] = [];
  const allowed = new Set<string>(marketplaceSpecialtyOptions);
  for (const m of SPECIALTY_MAPPINGS) {
    if (!allowed.has(m.specialty)) continue;
    for (const phrase of m.phrases) {
      entries.push({
        phrase,
        kind: "specialty",
        label: m.label,
        specialty: m.specialty,
      });
    }
  }
  return entries;
}

/** All phrases, longest first to prefer multi-word matches */
export function getSearchMappingEntries(): SearchMappingEntry[] {
  return [
    ...neighborhoodEntries(),
    ...cityEntries(),
    ...professionEntries(),
    ...specialtyEntries(),
  ].sort((a, b) => {
    const len = b.phrase.length - a.phrase.length;
    if (len !== 0) return len;
    /* Prefer profession over specialty when phrases tie (e.g. physical therapy) */
    if (a.kind === "profession" && b.kind === "specialty") return -1;
    if (a.kind === "specialty" && b.kind === "profession") return 1;
    return 0;
  });
}
