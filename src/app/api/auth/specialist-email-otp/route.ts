import { NextResponse } from "next/server";
import {
  sendSpecialistEmailOtp,
  verifySpecialistEmailOtp,
} from "@/lib/auth/specialist-email-otp-server";

interface Body {
  action?: string;
  email?: string;
  password?: string;
  firstName?: string;
  code?: string;
}

/**
 * Specialist onboarding email OTP — SMOAC-branded 6-digit code via Resend.
 * send: create/update Auth user (unconfirmed) + email code
 * verify: confirm email after correct code so the wizard can continue
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const action = body.action?.trim();
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (action === "send") {
    const result = await sendSpecialistEmailOtp({
      email,
      password,
      firstName: typeof body.firstName === "string" ? body.firstName : "",
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (action === "verify") {
    const result = await verifySpecialistEmailOtp({
      email,
      password,
      code: typeof body.code === "string" ? body.code : "",
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json(
    { ok: false, message: "action must be send or verify." },
    { status: 400 }
  );
}
