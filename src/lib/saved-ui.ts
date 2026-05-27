/**
 * Saved specialists — shared types, copy, toast presets, and formatters.
 * Single source for nav badges, page titles, and save confirmation toasts.
 */

export type SaveToastVariant = "added" | "removed" | "neutral";

export interface SaveToastOptions {
  title: string;
  variant?: SaveToastVariant;
  linkHref?: string;
  linkLabel?: string;
}

export function formatSavedCountBadge(count: number): string {
  if (count <= 0) return "";
  if (count > 99) return "99+";
  return String(count);
}

export function formatSavedSpecialistsTitle(count: number): string {
  if (count <= 0) return "Saved specialists";
  return `Saved specialists (${count})`;
}

export const SAVE_TOAST_ADDED: SaveToastOptions = {
  title: "Added to Saved Specialists",
  variant: "added",
  linkHref: "/saved",
  linkLabel: "View saved specialists →",
};

export const SAVE_TOAST_REMOVED: SaveToastOptions = {
  title: "Removed from Saved Specialists",
  variant: "removed",
};
