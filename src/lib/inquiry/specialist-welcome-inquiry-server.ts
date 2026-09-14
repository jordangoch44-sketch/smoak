import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { resolveSpecialistUserId } from "@/lib/specialist-notify-email";
import {
  SMOAC_TEAM_AVATAR_SRC,
  SMOAC_TEAM_DISPLAY_NAME,
  SMOAC_TEAM_EMAIL,
  SMOAC_WELCOME_ACTION_LABEL,
  SMOAC_WELCOME_SOURCE,
  buildSmoacWelcomeInquiryBody,
} from "@/lib/inquiry/specialist-welcome-inquiry";

const TEAM_AUTH_EMAIL =
  process.env.SMOAC_TEAM_EMAIL?.trim().toLowerCase() || "team@smoac.com";

export type PersistSpecialistWelcomeResult =
  | { ok: true; created: boolean; conversationId: string }
  | { ok: true; created: false; skipped: true }
  | { ok: false; message: string; localFallback?: boolean };

function isUniqueViolation(message: string | undefined): boolean {
  return Boolean(
    message && /duplicate key|unique constraint|23505/i.test(message)
  );
}

async function findAuthUserByEmail(
  service: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
  email: string
): Promise<string | null> {
  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) return null;
    const match = (data?.users ?? []).find(
      (user) => (user.email || "").trim().toLowerCase() === email
    );
    if (match?.id) return match.id;
    if ((data?.users ?? []).length < 200) break;
  }
  return null;
}

async function resolveSmoacTeamUserId(
  service: NonNullable<ReturnType<typeof createSupabaseServiceClient>>
): Promise<string | null> {
  const configured = process.env.SMOAC_TEAM_USER_ID?.trim();
  if (configured) {
    const { data } = await service.auth.admin.getUserById(configured);
    if (data.user?.id) return data.user.id;
  }

  const existing = await findAuthUserByEmail(service, TEAM_AUTH_EMAIL);
  if (existing) return existing;

  const { data, error } = await service.auth.admin.createUser({
    email: TEAM_AUTH_EMAIL,
    email_confirm: true,
    user_metadata: {
      role: "internal",
      first_name: SMOAC_TEAM_DISPLAY_NAME,
    },
  });
  if (data.user?.id) return data.user.id;

  if (error && /already been registered|already exists/i.test(error.message)) {
    return findAuthUserByEmail(service, TEAM_AUTH_EMAIL);
  }

  console.warn("[SMOAC] Could not resolve SMOAC team user", error?.message);
  return null;
}

async function ensureTeamProfile(
  service: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
  userId: string
): Promise<void> {
  const { data: existing } = await service
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  const patch = {
    first_name: SMOAC_TEAM_DISPLAY_NAME,
    email: TEAM_AUTH_EMAIL,
    avatar_url: SMOAC_TEAM_AVATAR_SRC,
  };

  if (existing?.user_id) {
    const updated = await service
      .from("profiles")
      .update({ ...patch, display_name: SMOAC_TEAM_DISPLAY_NAME })
      .eq("user_id", userId);
    if (updated.error && /display_name/i.test(updated.error.message)) {
      await service.from("profiles").update(patch).eq("user_id", userId);
    }
    return;
  }

  const insertRow = {
    user_id: userId,
    ...patch,
    last_name: "",
    display_name: SMOAC_TEAM_DISPLAY_NAME,
    client_goals: [] as string[],
    client_city: "",
    client_neighborhood: "",
    client_zip_code: "",
    client_budget: "",
    client_training_style: "",
    specialist_type: "",
    specialist_city: "",
    specialist_neighborhood: "",
    specialist_format: "",
    specialist_starting_price: "",
    onboarding_data: null,
    account_source: SMOAC_WELCOME_SOURCE,
  };

  const inserted = await service.from("profiles").insert(insertRow);
  if (inserted.error && /display_name|account_source/i.test(inserted.error.message)) {
    const {
      display_name: _display,
      account_source: _source,
      ...legacy
    } = insertRow;
    await service.from("profiles").insert(legacy);
  }
}

async function resolveApprovedSpecialistId(
  service: SupabaseClient,
  userId: string,
  requestedId?: string
): Promise<{ specialistId: string; specialistName: string } | null> {
  const requested = requestedId?.trim() ?? "";

  const { data: profile } = await service
    .from("specialist_profiles")
    .select("id, status, profile_data, user_id")
    .eq("user_id", userId)
    .maybeSingle();

  const profileId =
    typeof profile?.id === "string" ? profile.id.trim() : "";
  const profileStatus =
    typeof profile?.status === "string" ? profile.status.trim().toLowerCase() : "";
  const profileApproved = profileId && profileStatus === "approved";

  const { data: application } = await service
    .from("specialist_applications")
    .select("id, profile_status, application_data")
    .eq("user_id", userId)
    .maybeSingle();

  const applicationId =
    typeof application?.id === "string" ? application.id.trim() : "";
  const applicationApproved =
    applicationId &&
    typeof application?.profile_status === "string" &&
    application.profile_status === "APPROVED";

  const specialistId = requested
    ? requested
    : profileApproved
      ? profileId
      : applicationApproved
        ? applicationId
        : "";

  if (!specialistId) return null;
  if (requested && profileId && requested !== profileId && requested !== applicationId) {
    return null;
  }
  if (!profileApproved && !applicationApproved) return null;

  const owned = await resolveSpecialistUserId(service, specialistId);
  if (owned && owned !== userId) return null;

  const profileData =
    profile?.profile_data && typeof profile.profile_data === "object"
      ? (profile.profile_data as { name?: unknown })
      : null;
  const applicationData =
    application?.application_data && typeof application.application_data === "object"
      ? (application.application_data as { fullName?: unknown; name?: unknown })
      : null;
  const fromProfile =
    typeof profileData?.name === "string" ? profileData.name.trim() : "";
  const fromApp =
    (typeof applicationData?.fullName === "string"
      ? applicationData.fullName.trim()
      : "") ||
    (typeof applicationData?.name === "string" ? applicationData.name.trim() : "");

  return {
    specialistId,
    specialistName: fromProfile || fromApp || "Specialist",
  };
}

/**
 * Create the one-time SMOAC Team welcome thread. No email ping —
 * specialists see it unread in Inquiries.
 */
export async function persistSpecialistWelcomeInquiry(input: {
  specialistUserId: string;
  specialistId?: string;
  specialistName?: string;
  firstName?: string;
}): Promise<PersistSpecialistWelcomeResult> {
  const service = createSupabaseServiceClient();
  if (!service) {
    return {
      ok: false,
      message: "Welcome inquiry is not available on the server.",
      localFallback: true,
    };
  }

  const owned = await resolveApprovedSpecialistId(
    service,
    input.specialistUserId,
    input.specialistId
  );
  if (!owned) {
    return { ok: true, created: false, skipped: true };
  }

  const { data: existing } = await service
    .from("inquiry_conversations")
    .select("id")
    .eq("specialist_id", owned.specialistId)
    .eq("source", SMOAC_WELCOME_SOURCE)
    .maybeSingle();
  if (existing?.id) {
    return {
      ok: true,
      created: false,
      conversationId: existing.id as string,
    };
  }

  const teamUserId = await resolveSmoacTeamUserId(service);
  if (!teamUserId) {
    return {
      ok: false,
      message: "Could not send the SMOAC welcome message.",
      localFallback: true,
    };
  }

  await ensureTeamProfile(service, teamUserId);

  const now = new Date().toISOString();
  const specialistName =
    input.specialistName?.trim() || owned.specialistName;

  const insertRow = {
    client_user_id: teamUserId,
    specialist_id: owned.specialistId,
    specialist_user_id: input.specialistUserId,
    specialist_name: specialistName,
    inquiry_action: SMOAC_WELCOME_ACTION_LABEL,
    inquiry_topics: [] as string[],
    source: SMOAC_WELCOME_SOURCE,
    client_first_name: SMOAC_TEAM_DISPLAY_NAME,
    client_email: SMOAC_TEAM_EMAIL,
    client_avatar_url: SMOAC_TEAM_AVATAR_SRC,
    last_message_at: now,
  };

  let created = await service
    .from("inquiry_conversations")
    .insert(insertRow)
    .select("id")
    .single();

  if (created.error && /client_avatar_url/i.test(created.error.message)) {
    const { client_avatar_url: _omit, ...withoutAvatar } = insertRow;
    created = await service
      .from("inquiry_conversations")
      .insert(withoutAvatar)
      .select("id")
      .single();
  }

  if (created.error || !created.data?.id) {
    if (isUniqueViolation(created.error?.message)) {
      const { data: raced } = await service
        .from("inquiry_conversations")
        .select("id")
        .eq("specialist_id", owned.specialistId)
        .eq("source", SMOAC_WELCOME_SOURCE)
        .maybeSingle();
      if (raced?.id) {
        return {
          ok: true,
          created: false,
          conversationId: raced.id as string,
        };
      }
    }
    return {
      ok: false,
      message: created.error?.message ?? "Could not create welcome conversation.",
      localFallback: true,
    };
  }

  const conversationId = created.data.id as string;
  const { error: messageError } = await service.from("inquiry_messages").insert({
    conversation_id: conversationId,
    sender_user_id: teamUserId,
    sender_role: "client",
    body: buildSmoacWelcomeInquiryBody(input.firstName),
    inquiry_action: SMOAC_WELCOME_ACTION_LABEL,
    inquiry_topics: [],
    is_read: false,
  });

  if (messageError) {
    return {
      ok: false,
      message: messageError.message,
      localFallback: true,
    };
  }

  return { ok: true, created: true, conversationId };
}
