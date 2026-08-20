/**
 * Founding trainer invite — hidden shareable landing for the first cohort.
 * Not linked from public nav; validated via env invite code + optional cap.
 */

export const FOUNDING_TRAINERS_PATH = "/founding-trainers";

export const FOUNDING_INVITE_CODE_PARAM = "code";

export const JOIN_FOUNDING_PARAM = "founding";

export const FOUNDING_INVITE_STORAGE_KEY = "smoac.founding-trainer-invite";

export const FOUNDING_TRAINER_CAP = 50;

export interface FoundingTrainerInviteSession {
  code: string;
  acceptedAt: string;
}

export function getFoundingTrainerInviteCodeExpected(): string | null {
  const code = process.env.FOUNDING_TRAINER_INVITE_CODE?.trim();
  return code || null;
}

export function isFoundingInviteCodeValid(code: string | null | undefined): boolean {
  const expected = getFoundingTrainerInviteCodeExpected();
  if (!expected) return true;
  const trimmed = code?.trim();
  return Boolean(trimmed) && trimmed === expected;
}

export function buildFoundingTrainersInviteHref(code?: string): string {
  const params = new URLSearchParams();
  const trimmed = code?.trim();
  if (trimmed) params.set(FOUNDING_INVITE_CODE_PARAM, trimmed);
  const qs = params.toString();
  return qs ? `${FOUNDING_TRAINERS_PATH}?${qs}` : FOUNDING_TRAINERS_PATH;
}

export function buildFoundingTrainerJoinHref(options?: {
  inviteCode?: string;
}): string {
  const params = new URLSearchParams();
  params.set("role", "specialist");
  params.set(JOIN_FOUNDING_PARAM, "1");
  const trimmed = options?.inviteCode?.trim();
  if (trimmed) params.set(FOUNDING_INVITE_CODE_PARAM, trimmed);
  return `/create-account?${params.toString()}`;
}

/** Legacy helper — specialist join without welcome intro. */
export function buildFoundingSpecialistJoinHref(inviteCode?: string): string {
  return buildFoundingTrainerJoinHref({ inviteCode });
}

export function parseJoinFoundingFlag(
  value: string | string[] | undefined
): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "1";
}

export function readFoundingTrainerInviteSession():
  | FoundingTrainerInviteSession
  | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(FOUNDING_INVITE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FoundingTrainerInviteSession>;
    const code = parsed.code?.trim();
    const acceptedAt = parsed.acceptedAt?.trim();
    if (!code || !acceptedAt) return null;
    return { code, acceptedAt };
  } catch {
    return null;
  }
}

export function persistFoundingTrainerInviteSession(
  session: FoundingTrainerInviteSession
): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    FOUNDING_INVITE_STORAGE_KEY,
    JSON.stringify(session)
  );
}

export function clearFoundingTrainerInviteSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(FOUNDING_INVITE_STORAGE_KEY);
}

export async function fetchFoundingTrainerCohortFull(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const response = await fetch("/api/founding-trainers/status", {
      cache: "no-store",
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as { cohortFull?: boolean };
    return Boolean(payload.cohortFull);
  } catch {
    return false;
  }
}

export function formatFoundingSpotsRemaining(claimed: number, cap: number): string {
  const remaining = Math.max(0, cap - claimed);
  return String(remaining).padStart(3, "0");
}

export function formatFoundingCohortIndex(claimed: number, cap: number): string {
  const next = Math.min(claimed + 1, cap);
  return String(next).padStart(3, "0");
}
