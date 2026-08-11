/**
 * Display helpers for the profile hero personal byline.
 * Business name stays `trainer.name`; first name is derived, never invented.
 */

export function firstNameFromPersonName(fullOrFirst: string): string {
  const trimmed = fullOrFirst.trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0] ?? "";
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
  const first = firstNameFromPersonName(trainer.specialistFirstName ?? "");
  if (!first) return null;
  const business = (trainer.name ?? "").trim();
  if (business.toLowerCase() === first.toLowerCase()) return null;
  return formatSpecialistByline(first);
}
