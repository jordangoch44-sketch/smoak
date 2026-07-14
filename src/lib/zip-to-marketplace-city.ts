/** ZIP helpers shared by explore location filters and profile location. */

const FIVE_DIGIT_ZIP = /^\d{5}$/;

export function isValidZipCode(zip: string): boolean {
  return FIVE_DIGIT_ZIP.test(zip.trim());
}

export function normalizeZipCode(zip: string): string {
  return zip.replace(/\D/g, "").slice(0, 5);
}
