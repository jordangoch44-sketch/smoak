import { NextResponse } from "next/server";
import { getFounding50InviteStatus } from "@/lib/founding-50-invite-server";

export const dynamic = "force-dynamic";

/** Public status for Founding 50 landing + pre-submit cap checks. */
export async function GET() {
  const status = await getFounding50InviteStatus(null);
  return NextResponse.json({
    ok: true,
    cap: status.cap,
    claimed: status.claimed,
    spotsRemaining: status.spotsRemaining,
    isFull: status.isFull,
  });
}
