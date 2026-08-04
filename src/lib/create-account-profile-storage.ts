import { DEV_CREATE_ACCOUNT_PROFILE_KEY } from "@/lib/dev-storage-keys";
import type { CreateAccountProfile } from "@/types/create-account";

/** QA draft of last signup wizard submit — admin panel only until Phase 3 */
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
