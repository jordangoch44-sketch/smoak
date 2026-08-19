import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  FOUNDING_TRAINER_CAP,
  isFoundingInviteCodeValid,
} from "@/lib/founding-trainer-invite";

export type FoundingTrainerInviteStatus = {
  accessGranted: boolean;
  cap: number;
  claimed: number | null;
  spotsRemaining: number | null;
  cohortFull: boolean;
};

export async function countFoundingTrainerApplications(): Promise<number | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  const { count, error } = await supabase
    .from("specialist_applications")
    .select("id", { count: "exact", head: true })
    .in("profile_status", ["PENDING_APPROVAL", "APPROVED"])
    .contains("application_data", { foundingInvite: true });

  if (error) return null;
  return count ?? 0;
}

export async function getFoundingTrainerInviteStatus(
  inviteCode: string | null | undefined
): Promise<FoundingTrainerInviteStatus> {
  const cap = FOUNDING_TRAINER_CAP;
  const accessGranted = isFoundingInviteCodeValid(inviteCode);
  const claimed = await countFoundingTrainerApplications();
  const spotsRemaining =
    claimed === null ? null : Math.max(0, cap - claimed);
  const cohortFull =
    accessGranted && spotsRemaining !== null && spotsRemaining <= 0;

  return {
    accessGranted,
    cap,
    claimed,
    spotsRemaining,
    cohortFull,
  };
}

export async function assertFoundingTrainerCapacityAvailable(): Promise<void> {
  const claimed = await countFoundingTrainerApplications();
  if (claimed === null) return;
  if (claimed >= FOUNDING_TRAINER_CAP) {
    throw new Error("FOUNDING_COHORT_FULL");
  }
}
