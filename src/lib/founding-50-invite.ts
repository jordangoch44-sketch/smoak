/**
 * Founding 50 invite — hidden shareable landing for the first 50 specialists.
 * Not linked from public nav; validated via env invite code + cap.
 */

export const FOUNDING_50_PATH = "/founding-50";

/** @deprecated Use FOUNDING_50_PATH — kept for old redirects/bookmarks */
export const FOUNDING_TRAINERS_PATH = FOUNDING_50_PATH;

export const FOUNDING_50_LABEL = "Founding 50";

export const FOUNDING_INVITE_CODE_PARAM = "code";

export const JOIN_FOUNDING_PARAM = "founding";

export const FOUNDING_50_STORAGE_KEY = "smoac.founding-50-invite";

export const FOUNDING_50_CAP = 50;

/** @deprecated Use FOUNDING_50_CAP */
export const FOUNDING_TRAINER_CAP = FOUNDING_50_CAP;

export interface Founding50InviteSession {
  code: string;
  acceptedAt: string;
}

/** @deprecated Use Founding50InviteSession */
export type FoundingTrainerInviteSession = Founding50InviteSession;

export function getFounding50InviteCodeExpected(): string | null {
  const code =
    process.env.FOUNDING_50_INVITE_CODE?.trim() ||
    process.env.FOUNDING_TRAINER_INVITE_CODE?.trim();
  return code || null;
}

/** @deprecated Use getFounding50InviteCodeExpected */
export const getFoundingTrainerInviteCodeExpected = getFounding50InviteCodeExpected;

export function isFounding50InviteCodeValid(
  code: string | null | undefined
): boolean {
  const expected = getFounding50InviteCodeExpected();
  if (!expected) return true;
  const trimmed = code?.trim();
  return Boolean(trimmed) && trimmed === expected;
}

/** @deprecated Use isFounding50InviteCodeValid */
export const isFoundingInviteCodeValid = isFounding50InviteCodeValid;

export function buildFounding50InviteHref(code?: string): string {
  const params = new URLSearchParams();
  const trimmed = code?.trim();
  if (trimmed) params.set(FOUNDING_INVITE_CODE_PARAM, trimmed);
  const qs = params.toString();
  return qs ? `${FOUNDING_50_PATH}?${qs}` : FOUNDING_50_PATH;
}

/** @deprecated Use buildFounding50InviteHref */
export const buildFoundingTrainersInviteHref = buildFounding50InviteHref;

export function buildFounding50JoinHref(options?: {
  inviteCode?: string;
}): string {
  const params = new URLSearchParams();
  params.set("role", "specialist");
  params.set(JOIN_FOUNDING_PARAM, "1");
  const trimmed = options?.inviteCode?.trim();
  if (trimmed) params.set(FOUNDING_INVITE_CODE_PARAM, trimmed);
  return `/create-account?${params.toString()}`;
}

/** @deprecated Use buildFounding50JoinHref */
export const buildFoundingTrainerJoinHref = buildFounding50JoinHref;

export function parseJoinFoundingFlag(
  value: string | string[] | undefined
): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "1";
}

export function readFounding50InviteSession(): Founding50InviteSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.sessionStorage.getItem(FOUNDING_50_STORAGE_KEY) ??
      window.sessionStorage.getItem("smoac.founding-trainer-invite");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Founding50InviteSession>;
    const code = parsed.code?.trim();
    const acceptedAt = parsed.acceptedAt?.trim();
    if (!code || !acceptedAt) return null;
    return { code, acceptedAt };
  } catch {
    return null;
  }
}

/** @deprecated Use readFounding50InviteSession */
export const readFoundingTrainerInviteSession = readFounding50InviteSession;

export function persistFounding50InviteSession(
  session: Founding50InviteSession
): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    FOUNDING_50_STORAGE_KEY,
    JSON.stringify(session)
  );
}

/** @deprecated Use persistFounding50InviteSession */
export const persistFoundingTrainerInviteSession = persistFounding50InviteSession;

export function clearFounding50InviteSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(FOUNDING_50_STORAGE_KEY);
  window.sessionStorage.removeItem("smoac.founding-trainer-invite");
}

/** @deprecated Use clearFounding50InviteSession */
export const clearFoundingTrainerInviteSession = clearFounding50InviteSession;

export async function fetchFounding50Full(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const response = await fetch("/api/founding-50/status", {
      cache: "no-store",
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as { cohortFull?: boolean };
    return Boolean(payload.cohortFull);
  } catch {
    return false;
  }
}

/** @deprecated Use fetchFounding50Full */
export const fetchFoundingTrainerCohortFull = fetchFounding50Full;

export function formatFounding50SpotsRemaining(
  claimed: number,
  cap: number
): string {
  const remaining = Math.max(0, cap - claimed);
  return String(remaining).padStart(2, "0");
}

/** @deprecated Use formatFounding50SpotsRemaining */
export const formatFoundingSpotsRemaining = formatFounding50SpotsRemaining;

export function formatFounding50MemberIndex(
  claimed: number,
  cap: number
): string {
  const next = Math.min(claimed + 1, cap);
  return String(next).padStart(2, "0");
}

/** @deprecated Use formatFounding50MemberIndex */
export const formatFoundingCohortIndex = formatFounding50MemberIndex;
