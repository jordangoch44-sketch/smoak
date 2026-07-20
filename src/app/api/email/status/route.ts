import { NextResponse } from "next/server";
import { getEmailTransportMode } from "@/lib/email/email-transport";

/** Whether inquiry/confirmation emails use Resend or console logging. */
export async function GET() {
  return NextResponse.json({ mode: getEmailTransportMode() });
}
