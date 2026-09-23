import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin-api-auth";
import { sendAdminOutreach } from "@/lib/admin-outreach";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const caller = await requireAdminApiUser();
  if (!caller) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }

  let body: { templateId?: unknown; to?: unknown; confirmResend?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const result = await sendAdminOutreach({
    templateId: typeof body.templateId === "string" ? body.templateId.trim() : "",
    toEmail: typeof body.to === "string" ? body.to : "",
    confirmResend: body.confirmResend === true,
    userId: caller.userId,
  });

  if (!result.ok) {
    return NextResponse.json(result, {
      status: result.alreadySent ? 409 : 400,
    });
  }
  return NextResponse.json(result);
}
