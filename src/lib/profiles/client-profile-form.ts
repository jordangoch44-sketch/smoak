import type { ProfileRow } from "@/types/database";
import type { ClientProfileFormState } from "@/types/client-profile";
import {
  CLIENT_PRICE_PRESET_OPTIONS,
  type ClientPricePresetId,
} from "@/constants/client-profile-options";

/** Minimum fields for dashboard “Complete” → “Edit” wording. */
export function isClientProfileMinimumComplete(input: {
  firstName: string;
  postalCode: string;
  city: string;
  goals: string[];
}): boolean {
  const hasName = Boolean(input.firstName.trim());
  const hasLocation = Boolean(
    input.postalCode.trim() || input.city.trim()
  );
  const hasGoal = input.goals.some((goal) => goal.trim().length > 0);
  return hasName && hasLocation && hasGoal;
}

/** Weighted progress for the compact dashboard completion strip (0–100). */
export function getClientProfileCompletionPercent(input: {
  firstName: string;
  postalCode: string;
  city: string;
  goals: string[];
  hasAvatar?: boolean;
  hasBudget?: boolean;
  hasRadiusPreference?: boolean;
}): number {
  let score = 0;
  if (input.firstName.trim()) score += 30;
  if (input.postalCode.trim() || input.city.trim()) score += 30;
  if (input.goals.some((goal) => goal.trim().length > 0)) score += 25;
  if (input.hasAvatar) score += 10;
  if (input.hasBudget || input.hasRadiusPreference) score += 5;
  return Math.min(100, score);
}

export function resolvePricePreset(
  min: number | null | undefined,
  max: number | null | undefined
): ClientPricePresetId {
  if (min == null && max == null) return "none";
  for (const option of CLIENT_PRICE_PRESET_OPTIONS) {
    if (option.id === "none" || option.id === "custom") continue;
    if (option.min === min && option.max === max) return option.id;
  }
  return "custom";
}

export function priceBoundsForPreset(
  preset: ClientPricePresetId,
  customMin: string,
  customMax: string
): { min: number | null; max: number | null; label: string } {
  if (preset === "custom") {
    const minRaw = customMin.trim();
    const maxRaw = customMax.trim();
    const min = minRaw === "" ? null : Number(minRaw);
    const max = maxRaw === "" ? null : Number(maxRaw);
    const label =
      min != null && max != null
        ? `$${min}–$${max}`
        : min != null
          ? `From $${min}`
          : max != null
            ? `Up to $${max}`
            : "";
    return {
      min: Number.isFinite(min as number) ? min : null,
      max: Number.isFinite(max as number) ? max : null,
      label,
    };
  }

  const option = CLIENT_PRICE_PRESET_OPTIONS.find((item) => item.id === preset);
  return {
    min: option?.min ?? null,
    max: option?.max ?? null,
    label: option && option.id !== "none" ? option.label : "",
  };
}

export function validateCustomPriceRange(
  preset: ClientPricePresetId,
  customMin: string,
  customMax: string
): string | null {
  if (preset !== "custom") return null;
  const { min, max } = priceBoundsForPreset(preset, customMin, customMax);
  if (min != null && min < 0) return "Minimum price must be positive.";
  if (max != null && max < 0) return "Maximum price must be positive.";
  if (min != null && max != null && min > max) {
    return "Minimum price cannot exceed maximum price.";
  }
  return null;
}

function asStringArray(value: unknown): string[] {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return asStringArray(parsed);
    } catch {
      return value.trim() ? [value.trim()] : [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function asNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function profileRowToClientFormState(
  profile: ProfileRow | null,
  authEmail: string
): ClientProfileFormState {
  const email =
    authEmail.trim().toLowerCase() ||
    profile?.email?.trim().toLowerCase() ||
    "";
  if (!authEmail.trim() && profile?.email?.trim()) {
    console.warn(
      "[client-profile] Auth email missing; falling back to profiles.email"
    );
  }

  const priceMin = asNullableNumber(profile?.preferred_price_min);
  const priceMax = asNullableNumber(profile?.preferred_price_max);
  const preset = resolvePricePreset(priceMin, priceMax);

  const firstName = profile?.first_name?.trim() ?? "";
  const postalCode = profile?.client_zip_code?.trim() ?? "";
  const city = profile?.client_city?.trim() ?? "";
  const goals = asStringArray(profile?.client_goals);

  return {
    firstName,
    lastName: profile?.last_name?.trim() ?? "",
    displayName: profile?.display_name?.trim() ?? "",
    phone: profile?.phone?.trim() ?? "",
    postalCode,
    city,
    state: profile?.client_state?.trim() ?? "",
    email,
    pendingEmail: "",
    avatarUrl: profile?.avatar_url?.trim() ?? "",
    avatarPath: profile?.avatar_path?.trim() ?? "",
    goals,
    preferredRadiusMiles: asNullableNumber(profile?.preferred_radius_miles),
    pricePreset: preset,
    customPriceMin:
      preset === "custom" && priceMin != null ? String(priceMin) : "",
    customPriceMax:
      preset === "custom" && priceMax != null ? String(priceMax) : "",
    preferredProfessions: asStringArray(profile?.preferred_professions),
    preferredSpecialties: asStringArray(profile?.preferred_specialties),
    preferredGender: profile?.preferred_gender?.trim() ?? "",
    preferredSessionFormat:
      profile?.preferred_session_format?.trim() ||
      profile?.client_training_style?.trim() ||
      "",
    profileCompleted: isClientProfileMinimumComplete({
      firstName,
      postalCode,
      city,
      goals,
    }),
  };
}

export function toggleStringInList(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}
