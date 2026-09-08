import type { AuthSession } from "@/types/auth";
import { SPECIALIST_ONBOARDING_RESUME_HREF } from "@/lib/join-flow";
import {
  isDemoSpecialistDashboard,
  resolveManagedSpecialistId,
} from "@/lib/managed-specialist-profile";
import {
  findSpecialistApplicationByEmail,
  findSpecialistApplicationByUserId,
} from "@/lib/specialist-application-storage";
import type { SpecialistApplication } from "@/types/specialist-application";

export { SPECIALIST_ONBOARDING_RESUME_HREF };

type SpecialistSessionRef = Pick<AuthSession, "email" | "userId" | "role">;

export function findSubmittedSpecialistApplicationForSession(
  session: Pick<AuthSession, "email" | "userId"> | null | undefined
): SpecialistApplication | null {
  if (!session) return null;
  const userId = session.userId?.trim();
  if (userId) {
    const byUser = findSpecialistApplicationByUserId(userId);
    if (byUser) return byUser;
  }
  const email = session.email?.trim();
  if (email) {
    return findSpecialistApplicationByEmail(email);
  }
  return null;
}

/**
 * Signed-in specialist whose Auth/profile exist but who never submitted
 * `specialist_applications` — resume the form instead of fake "pending review".
 */
export function shouldResumeIncompleteSpecialistOnboarding(
  session: SpecialistSessionRef | null | undefined,
  options?: { applicationsHydrated?: boolean }
): boolean {
  if (!session || session.role !== "specialist") return false;
  if (options?.applicationsHydrated === false) return false;
  const existing = findSubmittedSpecialistApplicationForSession(session);
  if (existing && existing.profileStatus !== "DRAFT") return false;
  const trainerId = resolveManagedSpecialistId(session.email, session.userId);
  if (isDemoSpecialistDashboard(trainerId, session.email)) return false;
  return true;
}
