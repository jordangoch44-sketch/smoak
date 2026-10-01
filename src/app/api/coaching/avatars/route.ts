import { NextResponse } from "next/server";
import { resolvePublicAvatarUrl } from "@/lib/profiles/profile-avatar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const OPEN_STATUSES = ["invited", "active"] as const;

/**
 * Profile photos for the signed-in specialist's roster.
 * The caller can already see these relationships; profiles themselves stay private.
 */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, avatars: [] }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, avatars: [] }, { status: 401 });
  }

  const specialistId = new URL(request.url).searchParams.get("specialistId")?.trim() ?? "";
  if (!specialistId) {
    return NextResponse.json({ ok: false, avatars: [] }, { status: 400 });
  }

  const { data: relationships, error } = await supabase
    .from("coaching_relationships")
    .select("client_user_id")
    .eq("specialist_id", specialistId)
    .in("status", OPEN_STATUSES);
  if (error) {
    return NextResponse.json({ ok: false, avatars: [] }, { status: 403 });
  }

  const clientIds = [
    ...new Set(
      (relationships ?? [])
        .map((row) => (typeof row.client_user_id === "string" ? row.client_user_id : ""))
        .filter(Boolean)
    ),
  ];
  if (!clientIds.length) {
    return NextResponse.json({ ok: true, avatars: [] });
  }

  const admin = createSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ ok: true, avatars: [] });
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id, avatar_url, avatar_path")
    .in("user_id", clientIds);

  const avatars = (profiles ?? [])
    .map((profile) => {
      const clientUserId = typeof profile.user_id === "string" ? profile.user_id : "";
      const avatarUrl = resolvePublicAvatarUrl({
        avatarUrl: typeof profile.avatar_url === "string" ? profile.avatar_url : "",
        avatarPath: typeof profile.avatar_path === "string" ? profile.avatar_path : "",
      });
      return clientUserId && avatarUrl ? { clientUserId, avatarUrl } : null;
    })
    .filter((item): item is { clientUserId: string; avatarUrl: string } => item !== null);

  return NextResponse.json({ ok: true, avatars });
}
