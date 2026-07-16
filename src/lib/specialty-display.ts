/** Shared specialty chip display helpers for marketplace cards. */

export const DEFAULT_VISIBLE_SPECIALTIES = 2;

export function getVisibleSpecialties(
  specialties: readonly string[] | null | undefined,
  maxVisible: number = DEFAULT_VISIBLE_SPECIALTIES
): { visible: string[]; extraCount: number } {
  const cleaned = (specialties ?? [])
    .map((s) => s.trim())
    .filter(Boolean);
  if (cleaned.length === 0) {
    return { visible: [], extraCount: 0 };
  }
  const visible = cleaned.slice(0, Math.max(0, maxVisible));
  return {
    visible,
    extraCount: Math.max(0, cleaned.length - visible.length),
  };
}
