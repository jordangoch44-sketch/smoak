import { DEV_CREATE_ACCOUNT_PROFILE_KEY } from "@/lib/dev-storage-keys";
import type { CreateAccountProfile } from "@/types/create-account";

/** DEV ONLY — persist onboarding answers for QA until real signup ships */
export function persistCreateAccountProfile(profile: CreateAccountProfile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DEV_CREATE_ACCOUNT_PROFILE_KEY,
      JSON.stringify(profile)
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadCreateAccountProfile(): CreateAccountProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEV_CREATE_ACCOUNT_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CreateAccountProfile;
  } catch {
    return null;
  }
}
