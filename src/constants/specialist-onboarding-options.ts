/** Specialist onboarding — short signup path; depth deferred to dashboard after approval */
export const SPECIALIST_ONBOARDING_TOTAL_STEPS = 6;

export const PROFESSIONAL_TYPE_OPTIONS = [
  "Personal Trainer",
  "Strength Coach",
  "Physical Therapist",
  "Massage Therapist",
  "Nutrition Coach",
  "Hybrid Coach",
  "Running Coach",
  "Sports Performance Coach",
  "Chiropractor",
  "Pilates Instructor",
  "Yoga Instructor",
  "Recovery Specialist",
  "Mental Performance Coach",
  "Other",
] as const;

export const SPECIALIST_SPECIALTY_OPTIONS = [
  "Fat Loss",
  "Muscle Gain",
  "Strength",
  "Powerlifting",
  "Athletic Performance",
  "HYROX",
  "Rehab",
  "Mobility",
  "Women's Fitness",
  "Senior Fitness",
  "Youth Training",
  "Sports Specific",
  "Nutrition",
  "Posture",
  "Back Pain",
  "Corrective Exercise",
  "Bodybuilding",
  "General Fitness",
  "Endurance",
  "Tactical Fitness",
  "Functional Fitness",
] as const;

export const AGE_RANGE_OPTIONS = [
  "18–25",
  "26–35",
  "36–45",
  "46–55",
  "56–65",
  "65+",
  "All ages",
] as const;

export const MOTIVATION_STYLE_OPTIONS = [
  "High accountability",
  "Supportive",
  "Educational",
  "Competitive",
  "Balanced",
] as const;

export const DAY_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const TIME_BLOCK_OPTIONS = [
  "Morning",
  "Afternoon",
  "Evening",
] as const;

export const SESSION_DURATION_OPTIONS = [
  "30 minutes",
  "45 minutes",
  "60 minutes",
  "75 minutes",
  "90 minutes",
] as const;

export const GENDER_OPTIONS = [
  { value: "male" as const, label: "Male" },
  { value: "female" as const, label: "Female" },
] as const;

export const SPECIALIST_ONBOARDING_STEP_LABELS = [
  "Professional type",
  "Account details",
  "Service area",
  "Specialties",
  "Intro & rate",
  "Preview",
] as const;
