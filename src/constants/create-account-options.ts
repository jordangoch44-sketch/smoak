import { MAIN_PROFESSION_CATEGORIES } from "@/data/professions";

export const CLIENT_ACCOUNT_OPTION = {
  id: "client" as const,
  title: "Client",
  description: "Find, save, and compare health & wellness specialists.",
};

export const SPECIALIST_ACCOUNT_OPTION = {
  id: "specialist" as const,
  title: "Health & Wellness Professional",
  description: "Create a specialist profile and get discovered.",
};

export const CLIENT_GOAL_OPTIONS = [
  "Personal Training",
  "Weight Loss",
  "Physical Therapy",
  "Nutrition",
  "Recovery",
  "HYROX / Hybrid Training",
  "Women's Health",
  "Senior Fitness",
  "Other",
] as const;

export const SPECIALIST_TYPE_OPTIONS = MAIN_PROFESSION_CATEGORIES;

export const BUDGET_RANGE_OPTIONS = [
  "Under $75 / session",
  "$75–125 / session",
  "$125–200 / session",
  "$200+ / session",
  "Flexible",
] as const;

export const TRAINING_STYLE_OPTIONS = [
  "In-person",
  "Online",
  "Hybrid / Either",
] as const;

export const SESSION_FORMAT_OPTIONS = [
  "In-person",
  "Online",
  "Both",
] as const;

export const CREATE_ACCOUNT_TOTAL_STEPS = 5;
