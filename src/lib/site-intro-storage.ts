export const SITE_INTRO_SEEN_KEY = "smoac_site_intro_seen";

const INTRO_CHANGE_EVENT = "smoac-site-intro-change";

function notifySiteIntroChange(): void {
  window.dispatchEvent(new Event(INTRO_CHANGE_EVENT));
}

export function subscribeSiteIntroChange(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => onStoreChange();
  window.addEventListener(INTRO_CHANGE_EVENT, handler);
  return () => window.removeEventListener(INTRO_CHANGE_EVENT, handler);
}

export function hasSeenSiteIntro(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(SITE_INTRO_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function markSiteIntroSeen(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SITE_INTRO_SEEN_KEY, "1");
    notifySiteIntroChange();
  } catch {
    /* ignore */
  }
}

/** Clears the one-time homepage welcome flag (used by `?replay-intro=1`). */
export function clearSiteIntroSeen(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SITE_INTRO_SEEN_KEY);
    notifySiteIntroChange();
  } catch {
    /* ignore */
  }
}
