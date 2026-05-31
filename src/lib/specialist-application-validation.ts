import { findClientApplicationByEmail } from "@/lib/client-application-storage";
import { findSpecialistApplicationByEmail } from "@/lib/specialist-application-storage";
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

export function assertCanSubmitSpecialistApplication(email: string): void {
  const existing = findSpecialistApplicationByEmail(email);
  if (!existing) return;

  if (BLOCKING_SPECIALIST_STATUSES.includes(existing.profileStatus)) {
    const label =
      existing.profileStatus === "APPROVED" ? "approved" : "pending review";
    throw new ApplicationSubmitError(
      `An application for this email is already ${label}. Sign in or contact support if you need help.`
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
