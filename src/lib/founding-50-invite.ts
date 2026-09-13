/**
 * Founding 100 invite — hidden shareable landing for the first 100 specialists.
 * Not linked from public nav; validated via env invite code + cap.
 */

export const FOUNDING_50_PATH = "/founding-100";

export const FOUNDING_50_LABEL = "Founding 100";

export const FOUNDING_INVITE_CODE_PARAM = "code";

export const JOIN_FOUNDING_PARAM = "founding";

export const FOUNDING_50_STORAGE_KEY = "smoac.founding-50-invite";

export const FOUNDING_50_CAP = 100;

/** Marketplace launch — Dec 12, 2026, 10:00 AM Pacific (PST). */
export const FOUNDING_LAUNCH_AT_MS = Date.parse("2026-12-12T10:00:00-08:00");

export const FOUNDING_LAUNCH_LABEL = "December 12, 2026 · 10 AM PT";

export type FoundingCountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
};

export function getFoundingCountdownParts(
  nowMs = Date.now()
): FoundingCountdownParts {
  const remainingSec = Math.max(
    0,
    Math.floor((FOUNDING_LAUNCH_AT_MS - nowMs) / 1000)
  );
  return {
    days: Math.floor(remainingSec / 86400),
    hours: Math.floor((remainingSec % 86400) / 3600),
    minutes: Math.floor((remainingSec % 3600) / 60),
    seconds: remainingSec % 60,
    done: remainingSec === 0,
  };
}

export function padCountdownUnit(value: number, digits = 2): string {
  return String(value).padStart(digits, "0");
}

export interface Founding50InviteSession {
  code: string;
  acceptedAt: string;
}

export function getFounding50InviteCodeExpected(): string | null {
  const code =
    process.env.FOUNDING_50_INVITE_CODE?.trim() ||
    process.env.FOUNDING_TRAINER_INVITE_CODE?.trim();
  return code || null;
}

export function isFounding50InviteCodeValid(
  code: string | null | undefined
): boolean {
  const expected = getFounding50InviteCodeExpected();
  if (!expected) return true;
  const trimmed = code?.trim();
  return Boolean(trimmed) && trimmed === expected;
}

export function buildFounding50InviteHref(code?: string): string {
  const params = new URLSearchParams();
  const trimmed = code?.trim();
  if (trimmed) params.set(FOUNDING_INVITE_CODE_PARAM, trimmed);
  const qs = params.toString();
  return qs ? `${FOUNDING_50_PATH}?${qs}` : FOUNDING_50_PATH;
}

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

export function persistFounding50InviteSession(
  session: Founding50InviteSession
): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    FOUNDING_50_STORAGE_KEY,
    JSON.stringify(session)
  );
}

export function clearFounding50InviteSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(FOUNDING_50_STORAGE_KEY);
  window.sessionStorage.removeItem("smoac.founding-trainer-invite");
}

export async function fetchFounding50Full(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const response = await fetch("/api/founding-50/status", {
      cache: "no-store",
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as { isFull?: boolean };
    return Boolean(payload.isFull);
  } catch {
    return false;
  }
}

export function formatFounding50SpotsRemaining(
  claimed: number,
  cap: number
): string {
  const remaining = Math.max(0, cap - claimed);
  return String(remaining).padStart(3, "0");
}

export function formatFounding50MemberIndex(
  claimed: number,
  cap: number
): string {
  const next = Math.min(claimed + 1, cap);
  return String(next).padStart(3, "0");
}
