import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin-api-auth";
import { sendOutboundEmail } from "@/lib/email/email-transport";
import { findSystemEmail } from "@/lib/email/system-emails";

export const runtime = "nodejs";

interface Body {
  emailId?: string;
  to?: string;
}

/** Admin-only: send a sample of a code-built system email to one address. */
export async function POST(request: Request) {
  const caller = await requireAdminApiUser();
  if (!caller) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  const email = findSystemEmail(body?.emailId?.trim() ?? "");
  const to = body?.to?.trim().toLowerCase() ?? "";
  if (!email) {
    return NextResponse.json(
      { ok: false, message: "Unknown system email." },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json(
      { ok: false, message: "Enter a valid email address." },
      { status: 400 }
    );
  }

  const rendered = email.render();
  const result = await sendOutboundEmail({
    to,
    subject: `[Test] ${rendered.subject}`,
    text: rendered.text,
    html: rendered.html,
    kind: "email_test",
  });

  if (!result.success) {
    return NextResponse.json(
      { ok: false, message: "Send failed. Check the Resend setup and try again." },
      { status: 502 }
    );
  }
  return NextResponse.json({
    ok: true,
    message:
      result.mode === "resend"
        ? `Test sent to ${to}.`
        : `No RESEND_API_KEY here — the test was logged to the server console instead of sent.`,
  });
}
