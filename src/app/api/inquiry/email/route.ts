import { NextResponse } from "next/server";
import { sendOutboundEmail } from "@/lib/email/email-transport";

/**
 * @deprecated Prefer POST /api/email — kept so existing inquiry clients keep working.
 */
export async function POST(request: Request) {
  let body: {
    to?: string;
    subject?: string;
    text?: string;
    kind?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const kind =
    body.kind === "inquiry_client" || body.kind === "inquiry_specialist"
      ? body.kind
      : null;

  if (!to || !subject || !text || !kind) {
    return NextResponse.json(
      { success: false, error: "Missing to, subject, text, or kind" },
      { status: 400 }
    );
  }

  const result = await sendOutboundEmail({ to, subject, text, kind });
  return NextResponse.json(
    { success: result.success },
    { status: result.success ? 200 : 502 }
  );
}
