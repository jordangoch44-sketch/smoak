import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  FOUNDING_50_CAP,
  isFounding50InviteCodeValid,
} from "@/lib/founding-50-invite";

export type Founding50InviteStatus = {
  accessGranted: boolean;
  cap: number;
  claimed: number | null;
  spotsRemaining: number | null;
  isFull: boolean;
};

export async function countFounding50Applications(): Promise<number | null> {
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

export async function getFounding50InviteStatus(
  inviteCode: string | null | undefined
): Promise<Founding50InviteStatus> {
  const cap = FOUNDING_50_CAP;
  const accessGranted = isFounding50InviteCodeValid(inviteCode);
  const claimed = await countFounding50Applications();
  const spotsRemaining =
    claimed === null ? null : Math.max(0, cap - claimed);
  const isFull =
    accessGranted && spotsRemaining !== null && spotsRemaining <= 0;

  return {
    accessGranted,
    cap,
    claimed,
    spotsRemaining,
    isFull,
  };
}
