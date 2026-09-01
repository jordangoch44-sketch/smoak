/**
 * Display helpers for specialist names.
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
