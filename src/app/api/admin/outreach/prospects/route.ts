import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin-api-auth";
import {
  createOutreachProspect,
  listOutreachProspects,
  updateOutreachProspect,
} from "@/lib/outreach/prospects";
import { outreachLiveSendsEnabled } from "@/lib/outreach/live";

export const runtime = "nodejs";

function denied() {
  return NextResponse.json(
    { ok: false, message: "Admin access required." },
    { status: 403 }
  );
}

export async function GET(request: Request) {
  const caller = await requireAdminApiUser();
  if (!caller) return denied();

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "25");
  const loaded = await listOutreachProspects({
    q: url.searchParams.get("q") ?? "",
    status: url.searchParams.get("status") ?? "",
    category: url.searchParams.get("category") ?? "",
    source: url.searchParams.get("source") ?? "",
    channel: url.searchParams.get("channel") ?? "",
    igProgress: url.searchParams.get("ig") ?? "",
    archived: url.searchParams.get("archived") === "1",
    sort: url.searchParams.get("sort") ?? "name",
    dir: url.searchParams.get("dir") ?? "asc",
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 25,
  });
  if (!loaded.ok) {
    return NextResponse.json(
      { ok: false, message: loaded.message, liveSends: outreachLiveSendsEnabled() },
      { status: 503 }
    );
  }
  return NextResponse.json({
    ok: true,
    prospects: loaded.prospects,
    total: loaded.total,
    page: loaded.page,
    pageSize: loaded.pageSize,
    categories: loaded.categories,
    liveSends: outreachLiveSendsEnabled(),
  });
}

export async function POST(request: Request) {
  const caller = await requireAdminApiUser();
  if (!caller) return denied();
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }
  const saved = await createOutreachProspect(body, caller.userId);
  if (!saved.ok) {
    return NextResponse.json({ ok: false, message: saved.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, prospect: saved.prospect });
}

export async function PATCH(request: Request) {
  const caller = await requireAdminApiUser();
  if (!caller) return denied();
  const body = (await request.json().catch(() => null)) as
    | (Record<string, unknown> & { id?: unknown })
    | null;
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!body || !id) {
    return NextResponse.json({ ok: false, message: "Missing prospect." }, { status: 400 });
  }
  const saved = await updateOutreachProspect(id, {
    name: body.name,
    email: body.email,
    instagram: body.instagram,
    business: body.business,
    category: body.category,
    website: body.website,
    notes: body.notes,
    status: body.status,
  });
  if (!saved.ok) {
    return NextResponse.json({ ok: false, message: saved.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, prospect: saved.prospect });
}
