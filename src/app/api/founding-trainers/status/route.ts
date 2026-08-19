import { NextResponse } from "next/server";
import { getFoundingTrainerInviteStatus } from "@/lib/founding-trainer-invite-server";

export const dynamic = "force-dynamic";

/** Public status for invite landing + pre-submit cap checks. */
export async function GET() {
  const status = await getFoundingTrainerInviteStatus(null);
  return NextResponse.json({
    ok: true,
    cap: status.cap,
    claimed: status.claimed,
    spotsRemaining: status.spotsRemaining,
    cohortFull: status.cohortFull,
  });
}
