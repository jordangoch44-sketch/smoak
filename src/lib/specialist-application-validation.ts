import { findClientApplicationByEmail } from "@/lib/client-application-storage";
import {
  findSpecialistApplicationByEmail,
  findSpecialistApplicationByUserId,
} from "@/lib/specialist-application-storage";
import type { ProfileStatus } from "@/types/specialist-application";

const BLOCKING_SPECIALIST_STATUSES: ProfileStatus[] = [
  "PENDING_APPROVAL",
  "APPROVED",
];

export class ApplicationSubmitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationSubmitError";
  }
}

export function assertCanSubmitSpecialistApplication(
  email: string,
  userId?: string | null
): void {
  const byUser =
    userId?.trim() != null && userId.trim() !== ""
      ? findSpecialistApplicationByUserId(userId.trim())
      : null;
  const existing = byUser ?? findSpecialistApplicationByEmail(email);
  if (!existing) return;

  if (BLOCKING_SPECIALIST_STATUSES.includes(existing.profileStatus)) {
    const label =
      existing.profileStatus === "APPROVED" ? "approved" : "pending review";
    throw new ApplicationSubmitError(
      `An application for this account is already ${label}. Sign in to your specialist dashboard to continue.`
    );
  }
}

export function assertCanSubmitClientApplication(email: string): void {
  const existing = findClientApplicationByEmail(email);
  if (!existing) return;

  if (existing.status === "PENDING" || existing.status === "ACTIVE") {
    throw new ApplicationSubmitError(
      "An account with this email already exists. Sign in to continue."
    );
  }
}
