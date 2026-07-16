/**
 * Shared pending-signup + resume flags for inquiry and save quick-account flows.
 * One lightweight client account path — not duplicated per feature.
 */

export const PENDING_QUICK_SIGNUP_KEY = "smoac_pending_inquiry_signup";

export const INQUIRY_AUTO_SEND_FLAG_KEY = "smoac_inquiry_auto_send";
export const SAVE_AUTO_APPLY_FLAG_KEY = "smoac_save_auto_apply";
export const INQUIRY_IDEMPOTENCY_KEY = "smoac_inquiry_idempotency";

export type QuickAccountSource =
  | "specialist_inquiry"
  | "saved_specialist"
  | "account_menu";

export interface PendingQuickSignup {
  firstName: string;
  email: string;
  createdAt: string;
  accountSource?: QuickAccountSource;
}

export function readPendingInquirySignup(): PendingQuickSignup | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDING_QUICK_SIGNUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingQuickSignup;
    if (
      typeof parsed.firstName !== "string" ||
      typeof parsed.email !== "string" ||
      !parsed.firstName.trim() ||
      !parsed.email.trim()
    ) {
      return null;
    }
    return {
      firstName: parsed.firstName.trim(),
      email: parsed.email.trim().toLowerCase(),
      createdAt:
        typeof parsed.createdAt === "string"
          ? parsed.createdAt
          : new Date().toISOString(),
      accountSource:
        parsed.accountSource === "saved_specialist" ||
        parsed.accountSource === "specialist_inquiry" ||
        parsed.accountSource === "account_menu"
          ? parsed.accountSource
          : undefined,
    };
  } catch {
    return null;
  }
}

export function writePendingInquirySignup(input: {
  firstName: string;
  email: string;
  accountSource?: QuickAccountSource;
}): void {
  if (typeof window === "undefined") return;
  const record: PendingQuickSignup = {
    firstName: input.firstName.trim(),
    email: input.email.trim().toLowerCase(),
    createdAt: new Date().toISOString(),
    accountSource: input.accountSource,
  };
  window.localStorage.setItem(PENDING_QUICK_SIGNUP_KEY, JSON.stringify(record));
}

export function clearPendingInquirySignup(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_QUICK_SIGNUP_KEY);
}

export function setInquiryAutoSendFlag(enabled: boolean): void {
  if (typeof window === "undefined") return;
  if (enabled) {
    window.localStorage.setItem(INQUIRY_AUTO_SEND_FLAG_KEY, "1");
  } else {
    window.localStorage.removeItem(INQUIRY_AUTO_SEND_FLAG_KEY);
  }
}

export function peekInquiryAutoSendFlag(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(INQUIRY_AUTO_SEND_FLAG_KEY) === "1";
}

export function clearInquiryAutoSendFlag(): void {
  setInquiryAutoSendFlag(false);
}

export function setSaveAutoApplyFlag(enabled: boolean): void {
  if (typeof window === "undefined") return;
  if (enabled) {
    window.localStorage.setItem(SAVE_AUTO_APPLY_FLAG_KEY, "1");
  } else {
    window.localStorage.removeItem(SAVE_AUTO_APPLY_FLAG_KEY);
  }
}

export function peekSaveAutoApplyFlag(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SAVE_AUTO_APPLY_FLAG_KEY) === "1";
}

export function clearSaveAutoApplyFlag(): void {
  setSaveAutoApplyFlag(false);
}

export function createInquiryIdempotencyKey(draft: {
  specialistId: string;
  inquiryAction: string;
  inquiryTopics: readonly string[];
  message: string;
  startedAt: string;
}): string {
  return [
    draft.specialistId,
    draft.inquiryAction,
    draft.inquiryTopics.slice().sort().join(","),
    draft.message,
    draft.startedAt,
  ].join("|");
}

export function readLastInquiryIdempotencyKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(INQUIRY_IDEMPOTENCY_KEY);
}

export function writeLastInquiryIdempotencyKey(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INQUIRY_IDEMPOTENCY_KEY, key);
}
