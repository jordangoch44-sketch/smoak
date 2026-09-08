import {
  CLIENT_GENDER_PREF_OPTIONS,
  CLIENT_SEARCH_RADIUS_OPTIONS,
  CLIENT_SESSION_FORMAT_OPTIONS,
} from "@/constants/client-profile-options";
import {
  priceBoundsForPreset,
  resolvePricePreset,
} from "@/lib/profiles/client-profile-form";
import { resolveAvatarUrlFromProfile } from "@/lib/profiles/profile-avatar";
import type { ProfileRow } from "@/types/database";
import type { SpecialistLead } from "@/types/specialist-dashboard";

export interface InquiryClientPreview {
  conversationId: string;
  name: string;
  avatarUrl: string;
  location: string;
  goals: string[];
  professions: string[];
  specialties: string[];
  budgetLabel: string;
  sessionFormat: string;
  genderPreference: string;
  radiusLabel: string;
  inquiryTopics: string[];
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    try {
      return asStringArray(JSON.parse(value));
    } catch {
      return [value.trim()];
    }
  }
  return [];
}

function labelForGender(value: string): string {
  return (
    CLIENT_GENDER_PREF_OPTIONS.find((option) => option.value === value)?.label ??
    ""
  );
}

function labelForSessionFormat(value: string): string {
  return (
    CLIENT_SESSION_FORMAT_OPTIONS.find((option) => option.value === value)
      ?.label ?? ""
  );
}

function labelForRadius(miles: number | null): string {
  if (miles == null) return "";
  return (
    CLIENT_SEARCH_RADIUS_OPTIONS.find((option) => option.value === miles)
      ?.label ?? `${miles} miles`
  );
}

function formatLocation(profile: ProfileRow | null): string {
  if (!profile) return "";
  const parts = [
    profile.client_city?.trim() ?? "",
    profile.client_state?.trim() ?? "",
    profile.client_zip_code?.trim() ?? "",
  ].filter(Boolean);
  return parts.join(", ");
}

function formatBudget(profile: ProfileRow | null): string {
  if (!profile) return "";
  const min =
    typeof profile.preferred_price_min === "number"
      ? profile.preferred_price_min
      : null;
  const max =
    typeof profile.preferred_price_max === "number"
      ? profile.preferred_price_max
      : null;
  const preset = resolvePricePreset(min, max);
  const bounds = priceBoundsForPreset(
    preset,
    min != null ? String(min) : "",
    max != null ? String(max) : ""
  );
  if (bounds.label) return bounds.label;
  return profile.client_budget?.trim() ?? "";
}

export function previewFromProfileRow(input: {
  conversationId: string;
  fallbackName: string;
  fallbackAvatarUrl: string;
  inquiryTopics: string[];
  profile: ProfileRow | null;
}): InquiryClientPreview {
  const first = input.profile?.first_name?.trim() ?? "";
  const last = input.profile?.last_name?.trim() ?? "";
  const display = input.profile?.display_name?.trim() ?? "";
  const name =
    display || `${first} ${last}`.trim() || input.fallbackName.trim() || "Client";
  const avatar =
    resolveAvatarUrlFromProfile(input.profile) ||
    input.fallbackAvatarUrl.trim();
  const session =
    input.profile?.preferred_session_format?.trim() ||
    input.profile?.client_training_style?.trim() ||
    "";

  return {
    conversationId: input.conversationId,
    name,
    avatarUrl: avatar,
    location: formatLocation(input.profile),
    goals: asStringArray(input.profile?.client_goals),
    professions: asStringArray(input.profile?.preferred_professions),
    specialties: asStringArray(input.profile?.preferred_specialties),
    budgetLabel: formatBudget(input.profile),
    sessionFormat: labelForSessionFormat(session) || session,
    genderPreference: labelForGender(input.profile?.preferred_gender?.trim() ?? ""),
    radiusLabel: labelForRadius(
      typeof input.profile?.preferred_radius_miles === "number"
        ? input.profile.preferred_radius_miles
        : null
    ),
    inquiryTopics: input.inquiryTopics,
  };
}

export function previewFromLead(lead: SpecialistLead): InquiryClientPreview {
  return {
    conversationId: lead.id,
    name: lead.name.trim() || "Client",
    avatarUrl: lead.avatarUrl.trim(),
    location: "",
    goals: lead.intent.trim() ? [lead.intent.trim()] : [],
    professions: [],
    specialties: [],
    budgetLabel: "",
    sessionFormat: "",
    genderPreference: "",
    radiusLabel: "",
    inquiryTopics: lead.topicLabels,
  };
}

export async function fetchInquiryClientPreview(
  conversationId: string
): Promise<InquiryClientPreview | null> {
  const id = conversationId.trim();
  if (!id) return null;
  try {
    const response = await fetch(
      `/api/inquiry/client-preview?conversationId=${encodeURIComponent(id)}`,
      { credentials: "same-origin" }
    );
    const data = (await response.json().catch(() => null)) as
      | { ok: true; preview: InquiryClientPreview }
      | { ok: false; message?: string }
      | null;
    if (!response.ok || !data || data.ok !== true) return null;
    return data.preview;
  } catch {
    return null;
  }
}

export async function hideSpecialistInquiryConversation(
  conversationId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = conversationId.trim();
  if (!id) return { ok: false, message: "Conversation not found." };
  try {
    const response = await fetch("/api/inquiry/hide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ conversationId: id }),
    });
    const data = (await response.json().catch(() => null)) as
      | { ok: true }
      | { ok: false; message?: string }
      | null;
    if (!response.ok || !data || data.ok !== true) {
      return {
        ok: false,
        message: data && "message" in data && data.message
          ? data.message
          : "Could not delete this conversation.",
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Could not delete this conversation." };
  }
}
