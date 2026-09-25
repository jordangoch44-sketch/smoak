/** Replace outreach tokens. Missing first names become "there". */

const FIRST_NAME = /\{\{\s*first_name\s*\}\}/gi;
const BUSINESS_NAME = /\{\{\s*business_name\s*\}\}/gi;

export function outreachFirstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/).filter(Boolean)[0] ?? "";
  return first;
}

/** Greeting token value. Never empty. */
export function outreachGreetingName(fullName: string): string {
  return outreachFirstName(fullName) || "there";
}

export function applyOutreachVariables(
  template: string,
  input: { name: string; business: string }
): string {
  const first = outreachGreetingName(input.name);
  const business = input.business.trim() || "your business";
  return template
    .replace(FIRST_NAME, first)
    .replace(BUSINESS_NAME, business);
}
