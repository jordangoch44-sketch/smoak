/**
 * Display helpers for specialist first names.
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
/**
 * Personal name worth searching when it is not the same string as the
 * business listing. The listing itself stays searchable as `trainer.name`.
 */
export function specialistPersonNameForSearch(
  fullName: string,
  businessName: string
): string | undefined {
  const full = fullName.trim().replace(/\s+/g, " ");
  if (!full) return undefined;
  const business = businessName.trim();
  if (business && full.toLowerCase() === business.toLowerCase()) return undefined;
  return full;
}

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
