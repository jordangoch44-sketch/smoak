import type { Trainer } from "@/types";
import { listPublicMarketplaceTrainers } from "@/lib/marketplace-public-catalog";
import { sortTrainersByProximity } from "@/lib/trainer-proximity-sort";
import { haversineMiles } from "@/lib/geo/haversine";

/** Adjacent marketplace professions for “Similar specialists” rails */
const RELATED_PROFESSIONS: Record<string, readonly string[]> = {
  "Personal Trainer": [
    "Personal Trainer",
    "Wellness Coach",
    "Nutritionist",
    "Recovery Specialist",
  ],
  "Physical Therapist": [
    "Physical Therapist",
    "Chiropractor",
    "Massage Therapist",
    "Recovery Specialist",
    "Personal Trainer",
  ],
  Chiropractor: [
    "Chiropractor",
    "Physical Therapist",
    "Massage Therapist",
    "Recovery Specialist",
  ],
  Nutritionist: [
    "Nutritionist",
    "Wellness Coach",
    "Personal Trainer",
  ],
  "Massage Therapist": [
    "Massage Therapist",
    "Recovery Specialist",
    "Physical Therapist",
    "Chiropractor",
  ],
  "Recovery Specialist": [
    "Recovery Specialist",
    "Massage Therapist",
    "Physical Therapist",
    "Personal Trainer",
  ],
  "Wellness Coach": [
    "Wellness Coach",
    "Nutritionist",
    "Personal Trainer",
    "Recovery Specialist",
  ],
};

function normalizeCity(city: string): string {
  return city.trim().toLowerCase();
}

function specialtyOverlap(a: Trainer, b: Trainer): number {
  if (!a.specialty.length || !b.specialty.length) return 0;
  const set = new Set(a.specialty.map((s) => s.toLowerCase()));
  return b.specialty.reduce(
    (count, s) => (set.has(s.toLowerCase()) ? count + 1 : count),
    0
  );
}

function relatedProfessionRank(source: Trainer, candidate: Trainer): number {
  const related = RELATED_PROFESSIONS[source.profession] ?? [source.profession];
  const index = related.indexOf(candidate.profession);
  if (index === -1) return -1;
  return related.length - index;
}

function scoreSimilar(source: Trainer, candidate: Trainer): number {
  const professionScore = relatedProfessionRank(source, candidate);
  if (professionScore < 0) return -1;

  let score = professionScore * 100;
  score += specialtyOverlap(source, candidate) * 18;

  if (normalizeCity(source.city) === normalizeCity(candidate.city)) {
    score += 40;
  }

  if (
    Number.isFinite(source.latitude) &&
    Number.isFinite(source.longitude) &&
    Number.isFinite(candidate.latitude) &&
    Number.isFinite(candidate.longitude)
  ) {
    const miles = haversineMiles(
      source.latitude,
      source.longitude,
      candidate.latitude,
      candidate.longitude
    );
    if (miles <= 15) score += 30;
    else if (miles <= 35) score += 18;
    else if (miles <= 60) score += 8;
  }

  score += candidate.rating * 2;
  if (candidate.sponsored) score += 6;
  if (candidate.featured) score += 3;
  if (candidate.verified) score += 2;

  return score;
}

function excludeSelf(trainers: Trainer[], trainerId: string): Trainer[] {
  return trainers.filter((t) => t.id !== trainerId);
}

/**
 * Featured / sponsored specialists near the profile subject.
 * Sponsored first, then proximity / same city, excluding the current profile.
 */
export function getFeaturedSpecialistsNearTrainer(
  trainer: Trainer,
  limit = 8
): Trainer[] {
  const catalog = excludeSelf(listPublicMarketplaceTrainers(), trainer.id);
  const nearbyRadiusMiles = 45;

  const withDistance = catalog
    .map((candidate) => {
      const sameCity =
        normalizeCity(candidate.city) === normalizeCity(trainer.city);
      let miles = Number.POSITIVE_INFINITY;
      if (
        Number.isFinite(trainer.latitude) &&
        Number.isFinite(trainer.longitude) &&
        Number.isFinite(candidate.latitude) &&
        Number.isFinite(candidate.longitude)
      ) {
        miles = haversineMiles(
          trainer.latitude,
          trainer.longitude,
          candidate.latitude,
          candidate.longitude
        );
      }
      const nearby = sameCity || miles <= nearbyRadiusMiles;
      return { candidate, sameCity, miles, nearby };
    })
    .filter((row) => row.nearby);

  const sponsored = withDistance
    .filter((row) => row.candidate.sponsored || row.candidate.featured)
    .sort((a, b) => {
      const aSponsored = a.candidate.sponsored ? 1 : 0;
      const bSponsored = b.candidate.sponsored ? 1 : 0;
      if (aSponsored !== bSponsored) return bSponsored - aSponsored;
      return a.miles - b.miles;
    })
    .map((row) => row.candidate);

  if (sponsored.length >= limit) {
    return sponsored.slice(0, limit);
  }

  const sponsoredIds = new Set(sponsored.map((t) => t.id));
  const organic = sortTrainersByProximity(
    withDistance
      .map((row) => row.candidate)
      .filter((t) => !sponsoredIds.has(t.id)),
    { latitude: trainer.latitude, longitude: trainer.longitude }
  );

  return [...sponsored, ...organic].slice(0, limit);
}

/**
 * Specialists with related professions / overlapping specialties.
 * Prefers same city and proximity; never returns the current profile.
 */
export function getSimilarSpecialists(
  trainer: Trainer,
  limit = 10
): Trainer[] {
  const catalog = excludeSelf(listPublicMarketplaceTrainers(), trainer.id);

  return catalog
    .map((candidate) => ({
      candidate,
      score: scoreSimilar(trainer, candidate),
    }))
    .filter((row) => row.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.candidate)
    .slice(0, limit);
}

/** First sentence for hero — keeps the first-viewport scan light */
export function firstSentence(text: string, maxLength = 110): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^(.+?[.!?])(\s|$)/);
  const sentence = match?.[1]?.trim() || trimmed;
  if (sentence.length <= maxLength) return sentence;
  return `${sentence.slice(0, maxLength - 1).trimEnd()}…`;
}
