import { LOGO_ICON_SRC } from "@/lib/brand";
import { SUPPORT_EMAIL } from "@/lib/site-contact";
import { isMarketplaceSupabaseActive } from "@/lib/auth/marketplace-auth";
import {
  findLocalWelcomeInquiry,
  saveLocalSmoacWelcomeInquiry,
} from "@/lib/inquiry/inquiry-local-store";
import { isSmoacWelcomeConversationId } from "@/lib/inquiry/inquiry-paths";
import type { InquiryConversationRow } from "@/types/inquiry";
import type { InquiryClientPreview } from "@/lib/inquiry/inquiry-client-preview";

export const SMOAC_WELCOME_SOURCE = "smoac_welcome";
export const SMOAC_TEAM_LOCAL_USER_ID = "smoac-team";
export const SMOAC_TEAM_DISPLAY_NAME = "SMOAC Team";
export const SMOAC_TEAM_EMAIL = SUPPORT_EMAIL;
export const SMOAC_WELCOME_ACTION_LABEL = "Welcome";
export const SMOAC_TEAM_AVATAR_SRC = LOGO_ICON_SRC;

export function smoacWelcomeConversationId(specialistId: string): string {
  return `smoac-welcome-${specialistId.trim()}`;
}

export { isSmoacWelcomeConversationId } from "@/lib/inquiry/inquiry-paths";

export function isSmoacWelcomeConversation(
  conversation: Pick<InquiryConversationRow, "source" | "client_user_id" | "id">
): boolean {
  return (
    conversation.source === SMOAC_WELCOME_SOURCE ||
    conversation.client_user_id === SMOAC_TEAM_LOCAL_USER_ID ||
    isSmoacWelcomeConversationId(conversation.id)
  );
}

export function smoacWelcomeAvatarUrl(stored?: string | null): string {
  const trimmed = stored?.trim() ?? "";
  return trimmed || SMOAC_TEAM_AVATAR_SRC;
}

export function buildSmoacWelcomeInquiryBody(firstName?: string): string {
  const name = firstName?.trim().split(/\s+/)[0] ?? "";
  const hello = name ? `Hi ${name} — welcome to SMOAC.` : "Welcome to SMOAC.";

  return `${hello}

Clients reach you in Inquiries — the chat icon on Live view. Reply there to keep everything in one thread.

Use Edit Profile for photos and how you show up on Marketplace. Membership and Boost live under Plan, or Overview if you’re on Pro.

We’ll only send this once. Reply here if you need help.`;
}

export function smoacTeamClientPreview(
  conversationId: string
): InquiryClientPreview {
  return {
    conversationId,
    name: SMOAC_TEAM_DISPLAY_NAME,
    avatarUrl: SMOAC_TEAM_AVATAR_SRC,
    location: "",
    goals: ["A one-time note from the SMOAC team."],
    professions: [],
    specialties: [],
    budgetLabel: "",
    sessionFormat: "",
    genderPreference: "",
    radiusLabel: "",
    inquiryTopics: [],
  };
}

export type EnsureSpecialistWelcomeResult = {
  ok: true;
  created: boolean;
  conversationId?: string;
};

/**
 * Idempotent: one SMOAC Team welcome thread per specialist.
 * Prefers the live inquiry tables; falls back to local inbox in dev.
 */
export async function ensureSpecialistWelcomeInquiry(input: {
  specialistId: string;
  specialistName: string;
  specialistUserId: string;
  firstName?: string;
}): Promise<EnsureSpecialistWelcomeResult> {
  const specialistId = input.specialistId.trim();
  if (!specialistId) {
    return { ok: true, created: false };
  }

  if (isMarketplaceSupabaseActive() && typeof window !== "undefined") {
    try {
      const response = await fetch("/api/inquiry/specialist-welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          specialistId,
          specialistName: input.specialistName,
          firstName: input.firstName,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            created?: boolean;
            conversationId?: string;
            skipped?: boolean;
            localFallback?: boolean;
          }
        | null;
      if (response.ok && data?.ok && data.conversationId && !data.localFallback) {
        return {
          ok: true,
          created: Boolean(data.created),
          conversationId: data.conversationId,
        };
      }
    } catch {
      /* fall through to local seed */
    }
  }

  const existing = findLocalWelcomeInquiry(specialistId);
  if (existing) {
    return {
      ok: true,
      created: false,
      conversationId: existing.conversation.id,
    };
  }

  const local = saveLocalSmoacWelcomeInquiry({
    specialistId,
    specialistName: input.specialistName,
    specialistUserId: input.specialistUserId,
    body: buildSmoacWelcomeInquiryBody(input.firstName),
    avatarUrl: SMOAC_TEAM_AVATAR_SRC,
  });

  if (local.created && typeof window !== "undefined") {
    window.dispatchEvent(new Event("smoac:inquiry-updated"));
  }

  return {
    ok: true,
    created: local.created,
    conversationId: local.conversationId,
  };
}

/** Used when the API is unavailable — still only writes once. */
export function specialistHasLocalWelcomeInquiry(specialistId: string): boolean {
  return Boolean(findLocalWelcomeInquiry(specialistId));
}
