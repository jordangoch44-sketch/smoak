/**
 * Required fields for a basic account / listing.
 * Soft-submit may still allow incomplete specialist apps, but admin go-live
 * (`specialist-go-live-gate`) and these signup gates keep the bar honest.
 */

/** Create-account step 1 — must pick a role before Continue. */
export const REQUIRED_ACCOUNT_TYPE = ["Account type (Client or Specialist)"] as const;

/** Client quick signup (credentials screen). */
export const REQUIRED_CLIENT_BASIC_PROFILE = [
  "First name",
  "Last name",
  "Valid email",
  "Password (6+ characters)",
] as const;

/** Specialist short-path wizard — required to build a basic application. */
export const REQUIRED_SPECIALIST_BASIC_PROFILE = [
  "Professional type",
  "Full name",
  "Display / business name",
  "Headline",
  "Valid email",
  "Password (8+ characters)",
  "Phone number",
  "Primary ZIP code",
  "Service type",
  "Travel radius",
  "At least one specialty",
  "Short bio (40+ characters)",
  "Profile photo",
] as const;

/**
 * After approve — required before treating the listing as publish-ready
 * for clients (matches go-live gate + dashboard checklist).
 */
export const REQUIRED_SPECIALIST_PUBLISH_READY = [
  "Real profile photo",
  "Session price",
  "Bio (40+ characters)",
  "ZIP or city",
  "At least one specialty",
  "Professional type",
  "How clients book / availability",
] as const;
