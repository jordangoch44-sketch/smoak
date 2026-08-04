import {
  findSpecialistApplicationByEmail,
  findSpecialistApplicationByUserId,
} from "@/lib/specialist-application-storage";
import type { ProfileStatus } from "@/types/specialist-application";

const BLOCKING_SPECIALIST_STATUSES: ProfileStatus[] = ["APPROVED"];

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
    throw new ApplicationSubmitError(
      "This account is already approved. Sign in to your specialist dashboard to continue."
    );
  }
}
