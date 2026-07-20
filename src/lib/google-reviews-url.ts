/**
 * Lightweight Google Reviews / Maps URL checks for onboarding.
 * Does not call Google APIs — format + host only. Place ID verification is later.
 */

export type GoogleReviewsUrlCheck =
  | { ok: true; normalized: string }
  | { ok: false; message: string };

function looksLikeGoogleHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  if (host === "g.page" || host.endsWith(".g.page")) return true;
  if (host === "g.co" || host.endsWith(".g.co")) return true;
  if (host === "goo.gl" || host.endsWith(".goo.gl")) return true;
  if (host === "maps.app.goo.gl") return true;
  if (host.includes("google.")) return true;
  return false;
}

/** True for empty optional field. */
export function isGoogleReviewsUrlEmpty(value: string): boolean {
  return !value.trim();
}

/**
 * Validate an optional Google Reviews / Maps link.
 * Empty is allowed. Personal websites and non-Google hosts are rejected.
 */
export function validateGoogleReviewsUrl(raw: string): GoogleReviewsUrlCheck {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, normalized: "" };
  }

  /* Common mistake: Instagram / website pasted here */
  if (trimmed.startsWith("@")) {
    return {
      ok: false,
      message: "Paste a Google Maps or Google reviews link — not a social handle.",
    };
  }

  let url: URL;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    url = new URL(withScheme);
  } catch {
    return {
      ok: false,
      message: "Enter a full Google Maps or reviews URL.",
    };
  }

  if (!looksLikeGoogleHost(url.hostname)) {
    return {
      ok: false,
      message:
        "That doesn’t look like a Google link. Use Maps, g.page, or a Google reviews URL — not your website.",
    };
  }

  return { ok: true, normalized: url.toString() };
}

export function isValidGoogleReviewsUrl(raw: string): boolean {
  return validateGoogleReviewsUrl(raw).ok;
}
