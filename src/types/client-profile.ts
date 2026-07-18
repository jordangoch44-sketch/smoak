import type { ClientPricePresetId } from "@/constants/client-profile-options";

/** Editable client profile form state (not Auth password/email secrets). */
export interface ClientProfileFormState {
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string;
  postalCode: string;
  city: string;
  state: string;
  /** Auth email — display only; Auth is source of truth. */
  email: string;
  /** Pending Auth email change (confirmation required). */
  pendingEmail: string;
  avatarUrl: string;
  avatarPath: string;
  goals: string[];
  /** null = Automatic */
  preferredRadiusMiles: number | null;
  pricePreset: ClientPricePresetId;
  customPriceMin: string;
  customPriceMax: string;
  preferredProfessions: string[];
  preferredSpecialties: string[];
  preferredGender: string;
  preferredSessionFormat: string;
  profileCompleted: boolean;
}

export interface ClientProfileSaveInput {
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string;
  postalCode: string;
  city: string;
  state: string;
  /** Never blank — must fall back to Auth email before save. */
  email: string;
  avatarUrl: string;
  avatarPath: string;
  goals: string[];
  preferredRadiusMiles: number | null;
  preferredPriceMin: number | null;
  preferredPriceMax: number | null;
  clientBudgetLabel: string;
  preferredProfessions: string[];
  preferredSpecialties: string[];
  preferredGender: string;
  preferredSessionFormat: string;
}

export type ClientProfileSaveResult =
  | { ok: true; profileCompleted: boolean }
  | { ok: false; message: string; section?: string };
