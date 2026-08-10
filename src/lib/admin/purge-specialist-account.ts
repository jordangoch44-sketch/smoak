import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdminAppRole } from "@/types/auth-roles";

export type PurgeSpecialistAccountResult =
  | {
      ok: true;
      specialistId: string;
      authDeleted: boolean;
      deletedApplicationIds: string[];
      cleanupErrors?: string[];
    }
  | { ok: false; message: string; cleanupErrors?: string[] };

export interface PurgeSpecialistAccountInput {
  /** Application / catalog id (usually the same). */
  specialistId: string;
  /** Prefer when the application row is already loaded. */
  userId?: string | null;
  email?: string | null;
  /** Signed-in admin performing the action — cannot purge themselves. */
  callerUserId: string;
  /** Default true — frees the email for a fresh signup. */
  deleteAuthUser?: boolean;
}

/**
 * Hard-remove a specialist application identity from the marketplace:
 * catalog profile, all related application rows, engagement/saves/reviews,
 * and (by default) the Auth user so the email can be reused.
 */
export async function purgeSpecialistAccount(
  service: SupabaseClient,
  input: PurgeSpecialistAccountInput
): Promise<PurgeSpecialistAccountResult> {
  const specialistId = input.specialistId.trim();
  if (!specialistId) {
    return { ok: false, message: "specialistId is required." };
  }

  const deleteAuthUser = input.deleteAuthUser !== false;
  const cleanupErrors: string[] = [];

  const { data: profile, error: profileReadError } = await service
    .from("specialist_profiles")
    .select("id, user_id")
    .eq("id", specialistId)
    .maybeSingle();
  if (profileReadError) {
    return { ok: false, message: profileReadError.message };
  }

  const { data: application, error: appReadError } = await service
    .from("specialist_applications")
    .select("id, user_id, email")
    .eq("id", specialistId)
    .maybeSingle();
  if (appReadError) {
    return { ok: false, message: appReadError.message };
  }

  const email = (
    input.email?.trim() ||
    (typeof application?.email === "string" ? application.email : "") ||
    ""
  )
    .trim()
    .toLowerCase();

  let userId =
    (input.userId?.trim() ||
      (typeof profile?.user_id === "string" ? profile.user_id : "") ||
      (typeof application?.user_id === "string" ? application.user_id : "") ||
      "").trim() || null;

  /* If profile/app lack user_id, try Auth lookup by email so reject still frees it. */
  if (!userId && email) {
    const { data: listed, error: listError } =
      await service.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listError) {
      cleanupErrors.push(`auth.listUsers: ${listError.message}`);
    } else {
      const match = (listed?.users ?? []).find(
        (u) => (u.email || "").trim().toLowerCase() === email
      );
      if (match?.id) userId = match.id;
    }
  }

  if (userId && userId === input.callerUserId) {
    return {
      ok: false,
      message: "You cannot delete your own admin-linked specialist account.",
    };
  }

  if (userId) {
    const { data: roleRow } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (roleRow && isAdminAppRole(String(roleRow.role))) {
      return {
        ok: false,
        message: "Admin accounts cannot be deleted here.",
      };
    }
  }

  const savedRes = await service
    .from("saved_trainers")
    .delete()
    .eq("specialist_id", specialistId);
  if (savedRes.error) {
    cleanupErrors.push(`saved_trainers: ${savedRes.error.message}`);
  }

  const engagementRes = await service
    .from("specialist_engagement_events")
    .delete()
    .eq("specialist_id", specialistId);
  if (engagementRes.error) {
    console.warn(
      "[SMOAC admin] engagement purge:",
      engagementRes.error.message
    );
  }

  const reviewsRes = await service
    .from("specialist_reviews")
    .delete()
    .eq("specialist_id", specialistId);
  if (reviewsRes.error) {
    console.warn("[SMOAC admin] reviews purge:", reviewsRes.error.message);
  }

  /* Collect every application row for this identity, then hard-delete. */
  const appIds = new Set<string>([specialistId]);
  if (email) {
    const { data, error } = await service
      .from("specialist_applications")
      .select("id")
      .eq("email", email);
    if (error) {
      cleanupErrors.push(`specialist_applications(email): ${error.message}`);
    } else {
      for (const row of data ?? []) appIds.add(String(row.id));
    }
  }
  if (userId) {
    const { data, error } = await service
      .from("specialist_applications")
      .select("id")
      .eq("user_id", userId);
    if (error) {
      cleanupErrors.push(`specialist_applications(user_id): ${error.message}`);
    } else {
      for (const row of data ?? []) appIds.add(String(row.id));
    }
  }

  const deletedApplicationIds = [...appIds];
  if (deletedApplicationIds.length > 0) {
    const { error } = await service
      .from("specialist_applications")
      .delete()
      .in("id", deletedApplicationIds);
    if (error) {
      cleanupErrors.push(`specialist_applications delete: ${error.message}`);
    }
  }

  /* Hard-delete catalog rows by id and by user_id (no soft archive). */
  const profileIds = new Set<string>([specialistId, ...deletedApplicationIds]);
  const { error: profileByIdError } = await service
    .from("specialist_profiles")
    .delete()
    .in("id", [...profileIds]);
  if (profileByIdError) {
    return {
      ok: false,
      message: profileByIdError.message,
      cleanupErrors: cleanupErrors.length > 0 ? cleanupErrors : undefined,
    };
  }

  if (userId) {
    const { error: profileByUserError } = await service
      .from("specialist_profiles")
      .delete()
      .eq("user_id", userId);
    if (profileByUserError) {
      cleanupErrors.push(
        `specialist_profiles(user_id): ${profileByUserError.message}`
      );
    }
  }

  let authDeleted = false;
  if (deleteAuthUser && userId) {
    const { error: authError } = await service.auth.admin.deleteUser(userId);
    if (authError) {
      cleanupErrors.push(`auth.users: ${authError.message}`);
    } else {
      authDeleted = true;
    }
  }

  return {
    ok: true,
    specialistId,
    authDeleted,
    deletedApplicationIds,
    cleanupErrors: cleanupErrors.length > 0 ? cleanupErrors : undefined,
  };
}
