import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-api-auth";
import {
  readHomeEssenceConfig,
  writeHomeEssenceConfig,
} from "@/lib/home-essence-config-store";
import {
  getDefaultHomeEssenceConfig,
  normalizeHomeEssenceConfig,
} from "@/lib/home-essence-slides";

/** Full essence config for Admin → Settings (includes disabled slides). */
export async function GET() {
  if (!(await requireAdminApiAccess())) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }

  const config = await readHomeEssenceConfig();
  return NextResponse.json({ ok: true, config });
}

/** Save essence config (order, enabled, duration, alts, sources). */
export async function PUT(request: Request) {
  if (!(await requireAdminApiAccess())) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request body." },
      { status: 400 }
    );
  }

  const record =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : null;
  const rawConfig = record?.config ?? record;
  if (record?.reset === true) {
    const defaults = getDefaultHomeEssenceConfig();
    const saved = await writeHomeEssenceConfig(defaults);
    if (!saved.ok) {
      return NextResponse.json(
        { ok: false, message: saved.message },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, config: defaults });
  }

  const config = normalizeHomeEssenceConfig(rawConfig);
  const saved = await writeHomeEssenceConfig(config);
  if (!saved.ok) {
    return NextResponse.json(
      { ok: false, message: saved.message },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, config });
}
