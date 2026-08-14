/**
 * Display helpers for the profile hero personal byline.
 * Business name stays `trainer.name`; first name is derived, never invented.
 */

export function firstNameFromPersonName(fullOrFirst: string): string {
  const trimmed = fullOrFirst.trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0] ?? "";
}

/**
 * True when a stored “first name” is just the first token of the business /
 * listing name (e.g. “OTG” from “OTG Strength & Performance”).
 */
export function isBusinessDerivedFirstName(
  firstName: string,
  businessName: string
): boolean {
  const first = firstNameFromPersonName(firstName);
  const business = businessName.trim();
  if (!first || !business) return false;
  if (business.toLowerCase() === first.toLowerCase()) return true;
  const businessFirst = firstNameFromPersonName(business);
  return (
    Boolean(businessFirst) &&
    businessFirst.toLowerCase() === first.toLowerCase() &&
    business.split(/\s+/).length > 1
  );
}

/** Personal first name for bylines — never the business listing name. */
export function resolvePersonalSpecialistFirstName(trainer: {
  name?: string | null;
  specialistFirstName?: string | null;
}): string {
  const first = firstNameFromPersonName(trainer.specialistFirstName ?? "");
  if (!first) return "";
  if (isBusinessDerivedFirstName(first, trainer.name ?? "")) return "";
  return first;
}

/** e.g. SPECIALIST - Jordan */
export function formatSpecialistByline(firstName: string): string {
  const name = firstNameFromPersonName(firstName);
  if (!name) return "";
  return `SPECIALIST - ${name}`;
}

/**
 * Show the byline when we know a personal first name that isn’t already
 * the same as the business / display name on the listing.
 */
export function resolveSpecialistByline(trainer: {
  name?: string | null;
  specialistFirstName?: string | null;
}): string | null {
  const first = resolvePersonalSpecialistFirstName(trainer);
  if (!first) return null;
  return formatSpecialistByline(first);
}
