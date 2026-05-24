/** Inputs for SMOAC Value™ — wired to backend scoring later */
export interface TrainerMarketValueInputs {
  trainerPricingLow: number;
  trainerPricingHigh: number;
  trainerListedPrice: number;
  trainerReviewScore: number;
  trainerYearsExperience: number;
  trainerCertifications: number;
  trainerDemandScore: number;
  trainerProfileStrength: number;
}

export type TrainerPricePosition = "below" | "within" | "above";

export interface TrainerMarketValue {
  score: number;
  tierLabel: string;
  explanation: string;
  pricePosition: TrainerPricePosition;
  inputs: TrainerMarketValueInputs;
}
