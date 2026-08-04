import { getAuthSessionSnapshot } from "@/lib/auth-session-store";
import {
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import { fetchSpecialistApplicationByUserId } from "@/lib/applications/specialist-applications-db";
import { submitSpecialistApplication } from "@/lib/specialist-application-submit";
import {
  findSpecialistApplicationByEmail,
  findSpecialistApplicationByUserId,
  loadSpecialistOnboardingDraft,
  saveSpecialistApplication,
  saveSpecialistApplicationAsync,
} from "@/lib/specialist-application-storage";
import {
  INITIAL_SPECIALIST_ONBOARDING_STATE,
  type SpecialistApplication,
  type SpecialistOnboardingState,
} from "@/types/specialist-application";

function slugifyId(email: string): string {
  const base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "specialist"}-${Date.now().toString(36)}`;
}

function buildFallbackOnboardingState(input: {
  email: string;
  fullName?: string;
  avatarUrl?: string;
}): SpecialistOnboardingState {
  const fullName = input.fullName?.trim() || input.email.split("@")[0] || "Specialist";
  return {
    ...INITIAL_SPECIALIST_ONBOARDING_STATE,
    email: input.email.trim().toLowerCase(),
    fullName,
    displayName: fullName,
    media: {
      ...INITIAL_SPECIALIST_ONBOARDING_STATE.media,
      profilePhotoUrl: input.avatarUrl?.trim() || "",
    },
  };
}

export type EnsureSpecialistApplicationResult = {
  application: SpecialistApplication | null;
  created: boolean;
  message?: string;
};

/**
 * Guarantees a PENDING (or existing) specialist_applications row for a signed-in
 * specialist. Recovers accounts that signed up but never persisted an application
 * (e.g. mid-submit redirect races).
 */
export async function ensurePendingSpecialistApplicationForAuthUser(input: {
  userId: string;
  email: string;
  firstName?: string;
  displayName?: string;
  avatarUrl?: string;
}): Promise<EnsureSpecialistApplicationResult> {
  const userId = input.userId.trim();
  const email = input.email.trim().toLowerCase();
  if (!userId || !email) {
    return { application: null, created: false, message: "Missing account identity." };
  }

  const local =
    findSpecialistApplicationByUserId(userId) ??
    findSpecialistApplicationByEmail(email);
  if (local) {
    return { application: local, created: false };
  }

  if (isMarketplaceSupabaseActive()) {
    const supabase = getMarketplaceAuthClient();
    if (supabase) {
      const remote = await fetchSpecialistApplicationByUserId(supabase, userId);
      if (remote.ok && remote.application) {
        saveSpecialistApplication(remote.application);
        return { application: remote.application, created: false };
      }
    }
  }

  const draft = loadSpecialistOnboardingDraft();
  const draftMatches =
    Boolean(draft) && draft!.email.trim().toLowerCase() === email;

  const session = getAuthSessionSnapshot();
  const fullName =
    (draftMatches ? draft!.fullName.trim() : "") ||
    input.displayName?.trim() ||
    input.firstName?.trim() ||
    session?.displayName?.trim() ||
    session?.firstName?.trim() ||
    "";

  const state: SpecialistOnboardingState = draftMatches
    ? { ...draft!, email, password: "" }
    : buildFallbackOnboardingState({
        email,
        fullName,
        avatarUrl: input.avatarUrl || session?.avatarUrl,
      });

  try {
    const result = await submitSpecialistApplication(state, { userId });
    return { application: result.application, created: true };
  } catch (error) {
    /* If an approved/pending row already blocks submit, try a direct upsert of a
     * minimal pending application keyed by a fresh id only when truly missing. */
    const message =
      error instanceof Error ? error.message : "Could not create application.";

    if (/already approved/i.test(message)) {
      return { application: null, created: false, message };
    }

    const now = new Date().toISOString();
    const fallback: SpecialistApplication = {
      ...state,
      id: slugifyId(email),
      profileStatus: "PENDING_APPROVAL",
      password: "",
      submittedAt: now,
      updatedAt: now,
      userId,
      certifications: [],
    };

    const saved = await saveSpecialistApplicationAsync(fallback);
    if (!saved.ok) {
      return { application: null, created: false, message: saved.message || message };
    }
    return { application: saved.application, created: true };
  }
}
