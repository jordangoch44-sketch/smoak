import type { Gender } from "@/types/trainer";

/**
 * Canonical gender from profile / search text.
 * Marketplace listing gender is male or female only.
 * Empty means unknown — never invent a third option for a blank field.
 */
export function parseGender(value: unknown): Gender | "" {
  if (typeof value !== "string") return "";
  const raw = value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[\s_]+/g, "-");
  if (raw === "male" || raw === "man" || raw === "men") return "male";
  if (raw === "female" || raw === "woman" || raw === "women") return "female";
  return "";
}

export function isListedGender(value: unknown): value is Gender {
  return value === "male" || value === "female";
}

/** Gender chip / search filter. Unknown profile gender does not hide the specialist. */
export function trainerMatchesGenderFilter(
  trainerGender: unknown,
  filterGender: string
): boolean {
  const wanted = parseGender(filterGender);
  if (!wanted) return true;
  const actual = parseGender(trainerGender);
  if (!actual) return true;
  return actual === wanted;
}
