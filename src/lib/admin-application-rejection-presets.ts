export type AdminRejectionPresetId =
  | "incomplete-profile"
  | "missing-photo"
  | "missing-specialties"
  | "pricing-not-set"
  | "location-missing"
  | "bio-too-short"
  | "marketplace-standards"
  | "other";

export interface AdminRejectionPreset {
  id: AdminRejectionPresetId;
  label: string;
  reason: string;
}

/** Tap-to-fill presets for admin application rejection (each reason is 8+ chars). */
export const ADMIN_REJECTION_PRESETS: AdminRejectionPreset[] = [
  {
    id: "incomplete-profile",
    label: "Incomplete profile",
    reason:
      "Your profile is incomplete. Please finish all required sections before reapplying.",
  },
  {
    id: "missing-photo",
    label: "Missing photo",
    reason:
      "A profile photo is required. Please upload a clear, professional headshot.",
  },
  {
    id: "missing-specialties",
    label: "Missing specialties",
    reason:
      "Specialties are missing. Please list the training areas and services you offer.",
  },
  {
    id: "pricing-not-set",
    label: "Pricing not set",
    reason:
      "Session pricing is not set. Please add your rates and service options.",
  },
  {
    id: "location-missing",
    label: "Location / ZIP missing",
    reason:
      "Service location or ZIP code is missing. Please add where you train clients.",
  },
  {
    id: "bio-too-short",
    label: "Bio too short",
    reason:
      "Your bio is too short. Please expand on your background, approach, and experience.",
  },
  {
    id: "marketplace-standards",
    label: "Marketplace standards",
    reason:
      "This application does not meet SMOAC marketplace standards at this time.",
  },
  {
    id: "other",
    label: "Other",
    reason: "",
  },
];

export function findRejectionPresetByReason(
  reason: string
): AdminRejectionPreset | null {
  const trimmed = reason.trim();
  if (!trimmed) return null;
  return (
    ADMIN_REJECTION_PRESETS.find(
      (preset) => preset.id !== "other" && preset.reason === trimmed
    ) ?? null
  );
}
