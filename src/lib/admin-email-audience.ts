import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { AdminEmailAudienceId } from "@/types/admin-email";

export interface AdminEmailAudienceMember {
  email: string;
  firstName: string;
  userId: string | null;
}

const INACTIVE_DAYS = 30;

function uniqueMembers(
  members: AdminEmailAudienceMember[]
): AdminEmailAudienceMember[] {
  const seen = new Set<string>();
  const next: AdminEmailAudienceMember[] = [];
  for (const member of members) {
    const email = member.email.trim().toLowerCase();
    if (!email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    next.push({ ...member, email });
  }
  return next;
}

async function loadUnsubscribed(): Promise<Set<string>> {
  const service = createSupabaseServiceClient();
  if (!service) return new Set();
  const { data } = await service.from("admin_email_unsubscribes").select("email");
  return new Set(
    (data ?? [])
      .map((row) => String(row.email ?? "").trim().toLowerCase())
      .filter(Boolean)
  );
}

async function loadInactiveUserIds(): Promise<Set<string>> {
  const service = createSupabaseServiceClient();
  if (!service) return new Set();
  const cutoff = Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000;
  const inactive = new Set<string>();
  let page = 1;
  while (page <= 20) {
    const { data, error } = await service.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error || !data?.users?.length) break;
    for (const user of data.users) {
      const last = user.last_sign_in_at
        ? new Date(user.last_sign_in_at).getTime()
        : new Date(user.created_at).getTime();
      if (Number.isFinite(last) && last < cutoff) inactive.add(user.id);
    }
    if (data.users.length < 200) break;
    page += 1;
  }
  return inactive;
}

export async function resolveAdminEmailAudience(
  audienceIds: readonly AdminEmailAudienceId[]
): Promise<AdminEmailAudienceMember[]> {
  const service = createSupabaseServiceClient();
  if (!service || audienceIds.length === 0) return [];

  const unsubscribed = await loadUnsubscribed();
  const wantsInactive = audienceIds.includes("inactive");
  const inactiveIds = wantsInactive ? await loadInactiveUserIds() : new Set<string>();

  const { data: roles } = await service
    .from("user_roles")
    .select("user_id, role, is_premium")
    .in("role", ["specialist", "client"]);
  const roleRows = (roles ?? []) as Array<{
    user_id: string;
    role: string;
    is_premium: boolean | null;
  }>;
  const userIds = roleRows.map((row) => row.user_id);
  if (userIds.length === 0) return [];

  const { data: profiles } = await service
    .from("profiles")
    .select("user_id, email, first_name, display_name")
    .in("user_id", userIds);
  const profileById = new Map(
    ((profiles ?? []) as Array<{
      user_id: string;
      email: string;
      first_name: string | null;
      display_name?: string | null;
    }>).map((row) => [row.user_id, row])
  );

  const { data: specialistRows } = audienceIds.some((id) =>
    id.startsWith("specialists") || id === "inactive"
  )
    ? await service
        .from("specialist_profiles")
        .select("user_id, is_premium, membership_plan")
        .in("status", ["approved", "hidden"])
    : { data: [] as unknown[] };

  const specialistByUser = new Map(
    ((specialistRows ?? []) as Array<{
      user_id: string | null;
      is_premium: boolean | null;
      membership_plan?: string | null;
    }>)
      .filter((row) => row.user_id)
      .map((row) => [row.user_id as string, row])
  );

  const selected = new Set(audienceIds);
  const members: AdminEmailAudienceMember[] = [];

  for (const role of roleRows) {
    const profile = profileById.get(role.user_id);
    const email = String(profile?.email ?? "").trim().toLowerCase();
    if (!email.includes("@") || unsubscribed.has(email)) continue;

    const specialist = specialistByUser.get(role.user_id);
    const isPro =
      Boolean(role.is_premium) ||
      Boolean(specialist?.is_premium) ||
      specialist?.membership_plan === "premium" ||
      specialist?.membership_plan === "platinum";

    let match = false;
    if (selected.has("specialists_all") && role.role === "specialist") match = true;
    if (selected.has("clients_all") && role.role === "client") match = true;
    if (selected.has("specialists_pro") && role.role === "specialist" && isPro) {
      match = true;
    }
    if (selected.has("specialists_free") && role.role === "specialist" && !isPro) {
      match = true;
    }
    if (selected.has("inactive") && inactiveIds.has(role.user_id)) match = true;
    if (!match) continue;

    const firstName =
      String(profile?.first_name ?? "").trim() ||
      String(profile?.display_name ?? "").trim().split(/\s+/)[0] ||
      "";
    members.push({ email, firstName, userId: role.user_id });
  }

  return uniqueMembers(members);
}

export async function resolveIncompleteSpecialists(): Promise<
  AdminEmailAudienceMember[]
> {
  const service = createSupabaseServiceClient();
  if (!service) return [];
  const unsubscribed = await loadUnsubscribed();
  const { data } = await service
    .from("specialist_profiles")
    .select("user_id, display_name, profession, city, status")
    .eq("status", "approved");
  const incomplete = (data ?? []).filter((row) => {
    const name = String(row.display_name ?? "").trim();
    const profession = String(row.profession ?? "").trim();
    const city = String(row.city ?? "").trim();
    return !(name && profession && city);
  });
  const userIds = incomplete
    .map((row) => row.user_id)
    .filter((id): id is string => Boolean(id));
  if (userIds.length === 0) return [];
  const { data: profiles } = await service
    .from("profiles")
    .select("user_id, email, first_name")
    .in("user_id", userIds);
  return uniqueMembers(
    ((profiles ?? []) as Array<{ user_id: string; email: string; first_name: string | null }>).
      map((row) => ({
        email: String(row.email ?? ""),
        firstName: String(row.first_name ?? ""),
        userId: row.user_id,
      }))
      .filter((member) => !unsubscribed.has(member.email.trim().toLowerCase()))
  );
}

export async function countAdminEmailAudience(
  audienceIds: readonly AdminEmailAudienceId[]
): Promise<number> {
  const members = await resolveAdminEmailAudience(audienceIds);
  return members.length;
}
