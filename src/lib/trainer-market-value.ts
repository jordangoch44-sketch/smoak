import type { Trainer } from "@/types";
import type {
  TrainerMarketValue,
  TrainerMarketValueInputs,
  TrainerPricePosition,
} from "@/types/trainer-market-value";

function getPricePosition(
  listed: number,
  low: number,
  high: number
): TrainerPricePosition {
  if (listed < low) return "below";
  if (listed > high) return "above";
  return "within";
}

function getTierLabel(score: number): string {
  if (score >= 90) return "Excellent Value";
  if (score >= 80) return "Strong Value";
  if (score >= 70) return "Fair Value";
  if (score >= 60) return "Moderate Value";
  return "Premium Positioning";
}

function buildExplanation(position: TrainerPricePosition): string {
  if (position === "below") {
    return "This trainer is priced below the estimated fair market range for their experience, reviews, certifications, and demand.";
  }
  if (position === "above") {
    return "This trainer is priced above the estimated fair market range, reflecting premium demand, outcomes, and profile strength.";
  }
  return "This trainer is priced competitively for their experience, reviews, certifications, and market demand.";
}

/**
 * Builds SMOAC Value™ display data.
 * TODO: Replace demo constants with backend valuation service.
 */
export function buildTrainerMarketValue(trainer: Trainer): TrainerMarketValue {
  const inputs: TrainerMarketValueInputs = {
    trainerPricingLow: 110,
    trainerPricingHigh: 140,
    trainerListedPrice: trainer.pricePerSession,
    trainerReviewScore: trainer.rating,
    trainerYearsExperience: 8,
    trainerCertifications: trainer.certifications.length,
    trainerDemandScore: 78,
    trainerProfileStrength: 85,
  };

  const score = 92;
  const pricePosition = getPricePosition(
    inputs.trainerListedPrice,
    inputs.trainerPricingLow,
    inputs.trainerPricingHigh
  );

  return {
    score,
    tierLabel: getTierLabel(score),
    explanation: buildExplanation(pricePosition),
    pricePosition,
    inputs,
  };
}
