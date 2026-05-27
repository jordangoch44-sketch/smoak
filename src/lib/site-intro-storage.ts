export const SITE_INTRO_SEEN_KEY = "smoac_site_intro_seen";

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
    window.dispatchEvent(new Event("smoac-site-intro-change"));
  } catch {
    /* ignore */
  }
}
