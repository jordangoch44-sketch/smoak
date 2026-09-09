import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin-api-auth";
import { validateAdminEmail } from "@/lib/admin-email-catalog";
import {
  deleteAdminEmailFromDb,
  getAdminEmailFromDb,
  upsertAdminEmailInDb,
} from "@/lib/admin-email-db";
import type { AdminManagedEmail } from "@/types/admin-email";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const caller = await requireAdminApiUser();
  if (!caller) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }
  const { id } = await context.params;
  const email = await getAdminEmailFromDb(id);
  if (!email) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, email });
}

export async function PATCH(request: Request, context: RouteContext) {
  const caller = await requireAdminApiUser();
  if (!caller) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }
  const { id } = await context.params;
  let body: { email?: AdminManagedEmail };
  try {
    body = (await request.json()) as { email?: AdminManagedEmail };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }
  if (!body.email || body.email.id !== id) {
    return NextResponse.json({ ok: false, message: "Invalid email." }, { status: 400 });
  }
  const invalid = validateAdminEmail(body.email);
  if (invalid) {
    return NextResponse.json({ ok: false, message: invalid }, { status: 400 });
  }
  const saved = await upsertAdminEmailInDb(body.email, caller.userId);
  if (!saved) {
    return NextResponse.json(
      { ok: false, message: "Could not save email." },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true, email: saved });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const caller = await requireAdminApiUser();
  if (!caller) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }
  const { id } = await context.params;
  const ok = await deleteAdminEmailFromDb(id);
  if (!ok) {
    return NextResponse.json(
      { ok: false, message: "Could not delete email." },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
