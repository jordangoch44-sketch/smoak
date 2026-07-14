import {
  INQUIRY_MESSAGE_MAX_LENGTH,
  isInquiryActionId,
  isInquiryTopicId,
  type InquiryActionId,
  type InquiryTopicId,
} from "@/lib/inquiry-options";

export const PENDING_INQUIRY_STORAGE_KEY = "smoac_pending_inquiry";

export interface PendingInquiryDraft {
  specialistId: string;
  specialistName: string;
  inquiryAction: InquiryActionId;
  inquiryTopics: InquiryTopicId[];
  message: string;
  profilePath: string;
  startedAt: string;
}

function isTopicArray(value: unknown): value is InquiryTopicId[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && isInquiryTopicId(item))
  );
}

export function sanitizeInquiryMessage(message: string): string {
  return message.replace(/\s+/g, " ").trim().slice(0, INQUIRY_MESSAGE_MAX_LENGTH);
}

export function validateInquiryDraft(
  draft: Pick<
    PendingInquiryDraft,
    "inquiryAction" | "inquiryTopics" | "message" | "specialistId"
  >
): { ok: true } | { ok: false; message: string } {
  if (!draft.specialistId.trim()) {
    return { ok: false, message: "Missing specialist." };
  }
  if (!isInquiryActionId(draft.inquiryAction)) {
    return { ok: false, message: "Choose how we can help you." };
  }
  const topics = draft.inquiryTopics.filter(isInquiryTopicId);
  const message = sanitizeInquiryMessage(draft.message);
  if (topics.length === 0 && !message) {
    return {
      ok: false,
      message: "Add a question or choose at least one topic.",
    };
  }
  return { ok: true };
}

export function readPendingInquiryDraft(): PendingInquiryDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDING_INQUIRY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingInquiryDraft;
    if (
      typeof parsed.specialistId !== "string" ||
      !parsed.specialistId.trim() ||
      typeof parsed.specialistName !== "string" ||
      typeof parsed.profilePath !== "string" ||
      typeof parsed.message !== "string" ||
      typeof parsed.startedAt !== "string" ||
      !isInquiryActionId(parsed.inquiryAction) ||
      !isTopicArray(parsed.inquiryTopics)
    ) {
      return null;
    }
    return {
      specialistId: parsed.specialistId.trim(),
      specialistName: parsed.specialistName.trim(),
      inquiryAction: parsed.inquiryAction,
      inquiryTopics: parsed.inquiryTopics,
      message: sanitizeInquiryMessage(parsed.message),
      profilePath: parsed.profilePath || `/trainers/${parsed.specialistId}`,
      startedAt: parsed.startedAt,
    };
  } catch {
    return null;
  }
}

export function writePendingInquiryDraft(draft: PendingInquiryDraft): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    PENDING_INQUIRY_STORAGE_KEY,
    JSON.stringify({
      ...draft,
      message: sanitizeInquiryMessage(draft.message),
      inquiryTopics: draft.inquiryTopics.filter(isInquiryTopicId),
    })
  );
}

export function clearPendingInquiryDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_INQUIRY_STORAGE_KEY);
}

export function peekPendingInquiryDraft(): PendingInquiryDraft | null {
  return readPendingInquiryDraft();
}
