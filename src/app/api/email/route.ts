import { NextResponse } from "next/server";
import { sendOutboundEmail } from "@/lib/email/email-transport";

const ALLOWED_KINDS = new Set([
  "inquiry_client",
  "inquiry_specialist",
  "confirmation_client",
  "confirmation_specialist",
  "approval_specialist",
  "email_test",
]);

interface EmailBody {
  to?: string;
  subject?: string;
  text?: string;
  kind?: string;
}

/** Client-callable transactional email (Resend when configured). */
export async function POST(request: Request) {
  let body: EmailBody;
  try {
    body = (await request.json()) as EmailBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const kind = typeof body.kind === "string" ? body.kind.trim() : "";

  if (!to || !subject || !text || !kind || !ALLOWED_KINDS.has(kind)) {
    return NextResponse.json(
      { success: false, error: "Missing or invalid to, subject, text, or kind" },
      { status: 400 }
    );
  }

  const result = await sendOutboundEmail({ to, subject, text, kind });
  return NextResponse.json(
    { success: result.success, mode: result.mode },
    { status: result.success ? 200 : 502 }
  );
}
