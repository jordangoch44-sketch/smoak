import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getSupabasePublicConfig,
  getSupabaseServiceRoleKey,
} from "@/lib/supabase/config";
import { isAdminAppRole } from "@/types/auth-roles";

/**
 * Hard-delete specialist application row(s). Service-role backed.
 * Requires signed-in admin/owner.
 */

function serviceClient() {
  const config = getSupabasePublicConfig();
  const serviceKey = getSupabaseServiceRoleKey();
  if (!config || !serviceKey) return null;
  return createClient(config.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireAdminCaller() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!roleRow || !isAdminAppRole(String(roleRow.role))) return null;
  return { userId: user.id };
}

interface DeleteBody {
  applicationId?: string;
  /** After approve: remove other apps for same email/user, keep this id. */
  deleteSiblingsOf?: {
    id?: string;
    email?: string;
    userId?: string | null;
  };
}

export async function DELETE(request: Request) {
  const service = serviceClient();
  if (!service) {
    return NextResponse.json(
      { ok: false, message: "Supabase is not configured on the server." },
      { status: 503 }
    );
  }
  const caller = await requireAdminCaller();
  if (!caller) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }

  let body: DeleteBody;
  try {
    body = (await request.json()) as DeleteBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const applicationId = body.applicationId?.trim();
  const siblings = body.deleteSiblingsOf;

  if (applicationId) {
    const { error } = await service
      .from("specialist_applications")
      .delete()
      .eq("id", applicationId);
    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, deletedIds: [applicationId] });
  }

  if (siblings?.id?.trim()) {
    const keeperId = siblings.id.trim();
    const email = siblings.email?.trim().toLowerCase() || "";
    const userId = siblings.userId?.trim() || "";
    const ids = new Set<string>();

    if (email) {
      const { data, error } = await service
        .from("specialist_applications")
        .select("id")
        .eq("email", email);
      if (error) {
        return NextResponse.json(
          { ok: false, message: error.message },
          { status: 502 }
        );
      }
      for (const row of data ?? []) {
        if (row.id !== keeperId) ids.add(String(row.id));
      }
    }

    if (userId) {
      const { data, error } = await service
        .from("specialist_applications")
        .select("id")
        .eq("user_id", userId);
      if (error) {
        return NextResponse.json(
          { ok: false, message: error.message },
          { status: 502 }
        );
      }
      for (const row of data ?? []) {
        if (row.id !== keeperId) ids.add(String(row.id));
      }
    }

    const deletedIds = [...ids];
    if (deletedIds.length > 0) {
      const { error } = await service
        .from("specialist_applications")
        .delete()
        .in("id", deletedIds);
      if (error) {
        return NextResponse.json(
          { ok: false, message: error.message },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({ ok: true, deletedIds });
  }

  return NextResponse.json(
    { ok: false, message: "applicationId or deleteSiblingsOf is required." },
    { status: 400 }
  );
}
