/**
 * Lightweight specialist profile personalization — curated presets only.
 */

export const PROFILE_ACCENT_OPTIONS = [
  {
    id: "violet",
    label: "Violet",
    rgb: "124, 92, 255",
    swatch: "#7c5cff",
  },
  {
    id: "lavender",
    label: "Lavender",
    rgb: "186, 160, 255",
    swatch: "#baa0ff",
  },
  {
    id: "rose",
    label: "Rose",
    rgb: "232, 120, 168",
    swatch: "#e878a8",
  },
  {
    id: "teal",
    label: "Teal",
    rgb: "72, 196, 188",
    swatch: "#48c4bc",
  },
  {
    id: "amber",
    label: "Amber",
    rgb: "232, 176, 88",
    swatch: "#e8b058",
  },
] as const;

export type ProfileAccentId = (typeof PROFILE_ACCENT_OPTIONS)[number]["id"];

export const PROFILE_AVATAR_FRAME_OPTIONS = [
  { id: "none", label: "None" },
  { id: "ring", label: "Thin ring" },
  { id: "glow", label: "Soft glow" },
] as const;

export type ProfileAvatarFrameId =
  (typeof PROFILE_AVATAR_FRAME_OPTIONS)[number]["id"];

export const PROFILE_NAME_FONT_OPTIONS = [
  { id: "classic", label: "Classic", sample: "Aa" },
  { id: "modern", label: "Modern", sample: "Aa" },
  { id: "editorial", label: "Editorial", sample: "Aa" },
  { id: "display", label: "Display", sample: "Aa" },
] as const;

export type ProfileNameFontId =
  (typeof PROFILE_NAME_FONT_OPTIONS)[number]["id"];

export interface SpecialistProfileStyle {
  accent: ProfileAccentId;
  avatarFrame: ProfileAvatarFrameId;
  nameFont: ProfileNameFontId;
}

export const DEFAULT_PROFILE_STYLE: SpecialistProfileStyle = {
  accent: "violet",
  avatarFrame: "none",
  nameFont: "classic",
};

export function isProfileAccentId(value: unknown): value is ProfileAccentId {
  return PROFILE_ACCENT_OPTIONS.some((option) => option.id === value);
}

export function isProfileAvatarFrameId(
  value: unknown
): value is ProfileAvatarFrameId {
  return PROFILE_AVATAR_FRAME_OPTIONS.some((option) => option.id === value);
}

export function isProfileNameFontId(
  value: unknown
): value is ProfileNameFontId {
  return PROFILE_NAME_FONT_OPTIONS.some((option) => option.id === value);
}

export function normalizeProfileStyle(
  style?: Partial<SpecialistProfileStyle> | null
): SpecialistProfileStyle {
  return {
    accent: isProfileAccentId(style?.accent)
      ? style.accent
      : DEFAULT_PROFILE_STYLE.accent,
    avatarFrame: isProfileAvatarFrameId(style?.avatarFrame)
      ? style.avatarFrame
      : DEFAULT_PROFILE_STYLE.avatarFrame,
    nameFont: isProfileNameFontId(style?.nameFont)
      ? style.nameFont
      : DEFAULT_PROFILE_STYLE.nameFont,
  };
}

export function getProfileAccentRgb(accent: ProfileAccentId): string {
  return (
    PROFILE_ACCENT_OPTIONS.find((option) => option.id === accent)?.rgb ??
    PROFILE_ACCENT_OPTIONS[0].rgb
  );
}

export function profileStyleAccentLabel(accent: ProfileAccentId): string {
  return (
    PROFILE_ACCENT_OPTIONS.find((option) => option.id === accent)?.label ??
    "Violet"
  );
}

export function profileStyleFrameLabel(frame: ProfileAvatarFrameId): string {
  return (
    PROFILE_AVATAR_FRAME_OPTIONS.find((option) => option.id === frame)?.label ??
    "None"
  );
}

export function profileStyleFontLabel(font: ProfileNameFontId): string {
  return (
    PROFILE_NAME_FONT_OPTIONS.find((option) => option.id === font)?.label ??
    "Classic"
  );
}
