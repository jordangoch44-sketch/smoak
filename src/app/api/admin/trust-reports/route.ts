import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin-api-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdminApiUser();
  if (!admin) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }
  const service = createSupabaseServiceClient();
  if (!service) {
    return NextResponse.json(
      { ok: false, message: "Supabase is not configured." },
      { status: 503 }
    );
  }

  const { data, error } = await service
    .from("trust_reports")
    .select(
      "id, reporter_user_id, surface, reason, details, specialist_id, conversation_id, target_user_id, status, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 400 }
    );
  }

  const rows = data ?? [];
  const userIds = [
    ...new Set(
      rows
        .flatMap((row) => [row.reporter_user_id, row.target_user_id])
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    ),
  ];
  const names = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await service
      .from("profiles")
      .select("user_id, first_name, last_name, display_name, email")
      .in("user_id", userIds);
    for (const profile of profiles ?? []) {
      const name =
        String(profile.display_name ?? "").trim() ||
        [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() ||
        String(profile.email ?? "").trim();
      names.set(String(profile.user_id), name);
    }
  }

  return NextResponse.json({
    ok: true,
    reports: rows.map((row) => ({
      ...row,
      reporterName: names.get(String(row.reporter_user_id)) ?? "Account",
      targetName: row.target_user_id
        ? names.get(String(row.target_user_id)) ?? "Account"
        : "",
    })),
  });
}

export async function POST(request: Request) {
  const admin = await requireAdminApiUser();
  if (!admin) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }
  const service = createSupabaseServiceClient();
  if (!service) {
    return NextResponse.json(
      { ok: false, message: "Supabase is not configured." },
      { status: 503 }
    );
  }

  let body: { id?: string; status?: string };
  try {
    body = (await request.json()) as { id?: string; status?: string };
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request." },
      { status: 400 }
    );
  }

  const id = body.id?.trim() ?? "";
  const status = body.status === "dismissed" ? "dismissed" : "reviewed";
  if (!id) {
    return NextResponse.json(
      { ok: false, message: "Report not found." },
      { status: 400 }
    );
  }

  const { error } = await service
    .from("trust_reports")
    .update({ status })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
