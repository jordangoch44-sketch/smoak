/**
 * Pending marketplace signup — survives email-confirm gap when Auth returns
 * a user but no session (profiles/roles cannot be written until the user
 * confirms and signs in).
 */
import {
  DEV_PENDING_MARKETPLACE_SIGNUP_KEY,
} from "@/lib/dev-storage-keys";
import type { PublicAuthRole } from "@/types/auth-roles";
import type { CreateAccountProfile } from "@/types/create-account";

export interface PendingMarketplaceSignup {
  role: PublicAuthRole;
  email: string;
  firstName?: string;
  lastName?: string;
  clientProfile?: CreateAccountProfile;
  specialistProfile?: CreateAccountProfile;
  /** When true, submit specialist application after first successful specialist session */
  submitSpecialistApplication?: boolean;
  createdAt: string;
}

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function writePendingMarketplaceSignup(
  payload: Omit<PendingMarketplaceSignup, "createdAt">
): void {
  if (!canUseStorage()) return;
  try {
    const record: PendingMarketplaceSignup = {
      ...payload,
      email: payload.email.trim().toLowerCase(),
      createdAt: new Date().toISOString(),
    };
    window.localStorage.setItem(
      DEV_PENDING_MARKETPLACE_SIGNUP_KEY,
      JSON.stringify(record)
    );
  } catch {
    /* ignore quota */
  }
}

export function readPendingMarketplaceSignup(): PendingMarketplaceSignup | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(DEV_PENDING_MARKETPLACE_SIGNUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingMarketplaceSignup;
    if (!parsed?.email || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingMarketplaceSignup(): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(DEV_PENDING_MARKETPLACE_SIGNUP_KEY);
  } catch {
    /* ignore */
  }
}

/** Peek without requiring an exact email match (post-confirm login). */
export function peekPendingMarketplaceSignupForEmail(
  email: string
): PendingMarketplaceSignup | null {
  const pending = readPendingMarketplaceSignup();
  if (!pending) return null;
  if (pending.email !== email.trim().toLowerCase()) return null;
  return pending;
}
