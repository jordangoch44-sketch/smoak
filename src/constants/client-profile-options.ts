/** Goals shown in the client profile editor (multi-select chips). */
export const CLIENT_PROFILE_GOAL_OPTIONS = [
  "Lose weight",
  "Build muscle",
  "Get stronger",
  "Improve endurance",
  "Improve mobility",
  "Athletic performance",
  "Injury recovery",
  "General fitness",
  "Learn boxing",
  "Prepare for an event",
  "Improve nutrition",
  "Accountability",
] as const;

export const CLIENT_SEARCH_RADIUS_OPTIONS = [
  { label: "5 miles", value: 5 },
  { label: "10 miles", value: 10 },
  { label: "15 miles", value: 15 },
  { label: "20 miles", value: 20 },
  { label: "30 miles", value: 30 },
  { label: "50 miles", value: 50 },
  { label: "Automatic", value: null },
] as const;

export type ClientPricePresetId =
  | "none"
  | "under_50"
  | "50_75"
  | "75_100"
  | "100_150"
  | "150_plus"
  | "custom";

export const CLIENT_PRICE_PRESET_OPTIONS: ReadonlyArray<{
  id: ClientPricePresetId;
  label: string;
  min: number | null;
  max: number | null;
}> = [
  { id: "none", label: "No preference", min: null, max: null },
  { id: "under_50", label: "Under $50", min: null, max: 50 },
  { id: "50_75", label: "$50–$75", min: 50, max: 75 },
  { id: "75_100", label: "$75–$100", min: 75, max: 100 },
  { id: "100_150", label: "$100–$150", min: 100, max: 150 },
  { id: "150_plus", label: "$150+", min: 150, max: null },
  { id: "custom", label: "Custom range", min: null, max: null },
];

export const CLIENT_PROFESSION_OPTIONS = [
  "Personal Trainer",
  "Physical Therapist",
  "Nutrition Coach",
  "Recovery Specialist",
  "Strength Coach",
  "Run Coach",
  "Wellness Coach",
  "Boxing Coach",
  "Other",
] as const;

export const CLIENT_SPECIALTY_OPTIONS = [
  "Weight Loss",
  "Strength & Hypertrophy",
  "Mobility",
  "Sports Performance",
  "Injury Recovery",
  "Nutrition",
  "HYROX / Hybrid",
  "Women's Health",
  "Senior Fitness",
  "Boxing",
] as const;

export const CLIENT_GENDER_PREF_OPTIONS = [
  { value: "", label: "No preference" },
  { value: "female", label: "Women" },
  { value: "male", label: "Men" },
] as const;

export const CLIENT_SESSION_FORMAT_OPTIONS = [
  { value: "", label: "No preference" },
  { value: "in_person", label: "In-person" },
  { value: "online", label: "Online" },
  { value: "either", label: "Either" },
  { value: "mobile", label: "Mobile trainer" },
  { value: "gym", label: "Gym-based" },
  { value: "home", label: "Home visits" },
] as const;

export const CLIENT_AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const CLIENT_AVATAR_ACCEPT =
  "image/jpeg,image/jpg,image/png,image/webp";
