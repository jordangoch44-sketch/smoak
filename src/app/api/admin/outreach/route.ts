import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin-api-auth";
import {
  createAdminOutreachTemplate,
  deleteAdminOutreachTemplate,
  normalizeOutreachDraft,
  readAdminOutreach,
  updateAdminOutreachTemplate,
} from "@/lib/admin-outreach";
import { outreachLiveSendsEnabled } from "@/lib/outreach/live";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const caller = await requireAdminApiUser();
  if (!caller) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }

  const includeArchived =
    new URL(request.url).searchParams.get("includeArchived") === "1";
  const loaded = await readAdminOutreach({ includeArchived });
  if (!loaded.ok) {
    return NextResponse.json(
      { ok: false, message: loaded.message },
      { status: 503 }
    );
  }
  return NextResponse.json({
    ok: true,
    ...loaded.snapshot,
    liveSends: outreachLiveSendsEnabled(),
  });
}

export async function POST(request: Request) {
  const caller = await requireAdminApiUser();
  if (!caller) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }

  const parsed = await readDraft(request);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, message: parsed.message }, { status: 400 });
  }

  const saved = await createAdminOutreachTemplate(parsed.draft, caller.userId);
  if (!saved.ok) {
    return NextResponse.json({ ok: false, message: saved.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true, template: saved.template });
}

export async function PUT(request: Request) {
  const caller = await requireAdminApiUser();
  if (!caller) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }

  const parsed = await readDraft(request);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, message: parsed.message }, { status: 400 });
  }
  if (!parsed.id) {
    return NextResponse.json(
      { ok: false, message: "Missing template." },
      { status: 400 }
    );
  }

  const saved = await updateAdminOutreachTemplate(
    parsed.id,
    parsed.draft,
    caller.userId
  );
  if (!saved.ok) {
    return NextResponse.json({ ok: false, message: saved.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true, template: saved.template });
}

export async function DELETE(request: Request) {
  const caller = await requireAdminApiUser();
  if (!caller) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }

  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json(
      { ok: false, message: "Missing template." },
      { status: 400 }
    );
  }

  const removed = await deleteAdminOutreachTemplate(id);
  if (!removed.ok) {
    return NextResponse.json(
      { ok: false, message: removed.message },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}

async function readDraft(request: Request): Promise<
  | { ok: true; id: string; draft: { name: string; subject: string; body: string } }
  | { ok: false; message: string }
> {
  let body: { id?: unknown; name?: unknown; subject?: unknown; body?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return { ok: false, message: "Invalid JSON." };
  }
  const draft = normalizeOutreachDraft(body);
  if ("error" in draft) return { ok: false, message: draft.error };
  return {
    ok: true,
    id: typeof body.id === "string" ? body.id.trim() : "",
    draft,
  };
}
