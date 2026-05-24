export const LOGIN_SUGGESTION_SEEN_KEY = "smoac_login_tip_seen";

export function hasSeenLoginSuggestion(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(LOGIN_SUGGESTION_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function markLoginSuggestionSeen(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(LOGIN_SUGGESTION_SEEN_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}
