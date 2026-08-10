import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { purgeSpecialistAccount } from "@/lib/admin/purge-specialist-account";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getSupabasePublicConfig,
  getSupabaseServiceRoleKey,
} from "@/lib/supabase/config";

/**
 * Permanently remove a specialist from the marketplace.
 * Service-role backed; requires signed-in owner_admin.
 */

function serviceClient() {
  const config = getSupabasePublicConfig();
  const serviceKey = getSupabaseServiceRoleKey();
  if (!config || !serviceKey) return null;
  return createClient(config.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireOwnerAdminCaller() {
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

  if (!roleRow || String(roleRow.role) !== "owner_admin") return null;
  return { userId: user.id };
}

function forbidden() {
  return NextResponse.json(
    { ok: false, message: "Owner admin access required." },
    { status: 403 }
  );
}

function unavailable() {
  return NextResponse.json(
    { ok: false, message: "Supabase is not configured on the server." },
    { status: 503 }
  );
}

interface DeleteBody {
  specialistId?: string;
  /** Also delete the linked Auth user (specialist login). Default true. */
  deleteAuthUser?: boolean;
}

export async function DELETE(request: Request) {
  const service = serviceClient();
  if (!service) return unavailable();
  const caller = await requireOwnerAdminCaller();
  if (!caller) return forbidden();

  let body: DeleteBody;
  try {
    body = (await request.json()) as DeleteBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const specialistId = body.specialistId?.trim();
  if (!specialistId) {
    return NextResponse.json(
      { ok: false, message: "specialistId is required." },
      { status: 400 }
    );
  }

  const result = await purgeSpecialistAccount(service, {
    specialistId,
    callerUserId: caller.userId,
    deleteAuthUser: body.deleteAuthUser !== false,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: result.message,
        cleanupErrors: result.cleanupErrors,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    specialistId: result.specialistId,
    authDeleted: result.authDeleted,
    deletedApplicationIds: result.deletedApplicationIds,
    cleanupErrors: result.cleanupErrors,
  });
}
