import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin-api-auth";
import { validateAdminEmail } from "@/lib/admin-email-catalog";
import {
  listAdminEmailsFromDb,
  upsertAdminEmailInDb,
} from "@/lib/admin-email-db";
import { ensureDefaultAdminEmails } from "@/lib/admin-email-defaults";
import type { AdminManagedEmail } from "@/types/admin-email";

export const runtime = "nodejs";

export async function GET() {
  const caller = await requireAdminApiUser();
  if (!caller) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }
  const emails = await listAdminEmailsFromDb();
  if (!emails) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Could not load emails. Check the admin_emails table is migrated.",
      },
      { status: 503 }
    );
  }
  await ensureDefaultAdminEmails();
  const next = (await listAdminEmailsFromDb()) ?? emails;
  return NextResponse.json({ ok: true, emails: next });
}

export async function POST(request: Request) {
  const caller = await requireAdminApiUser();
  if (!caller) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }
  let body: { email?: AdminManagedEmail };
  try {
    body = (await request.json()) as { email?: AdminManagedEmail };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }
  const email = body.email;
  if (!email) {
    return NextResponse.json({ ok: false, message: "Missing email." }, { status: 400 });
  }
  const invalid = validateAdminEmail(email);
  if (invalid) {
    return NextResponse.json({ ok: false, message: invalid }, { status: 400 });
  }
  const saved = await upsertAdminEmailInDb(email, caller.userId);
  if (!saved) {
    return NextResponse.json(
      { ok: false, message: "Could not save email. Check the admin_emails table is migrated." },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true, email: saved });
}
