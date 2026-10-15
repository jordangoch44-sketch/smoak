import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientWorkoutExercise } from "@/types/client-workout";
import type { InquiryConversationRow } from "@/types/inquiry";
import type {
  CoachingRelationship,
  CoachingRelationshipRow,
  CoachWorkout,
  CoachWorkoutRow,
  CoachWorkoutStatus,
} from "@/types/coaching";
import { mapCoachingRelationship, mapCoachWorkout } from "@/lib/coaching/coach-workout";

export type CoachingResult<T> = { ok: true; data: T } | { ok: false; message: string };

const OPEN_STATUSES = ["invited", "requested", "active"] as const;

function failure(message: string | undefined, fallback: string): { ok: false; message: string } {
  if (message?.includes("pro_required")) {
    return { ok: false, message: "Rosters are a SMOAC Pro feature." };
  }
  return { ok: false, message: message || fallback };
}

/** Invited, requested, and active clients for the specialist's marketplace id. */
export async function fetchSpecialistRoster(
  supabase: SupabaseClient,
  specialistId: string
): Promise<CoachingResult<CoachingRelationship[]>> {
  const { data, error } = await supabase
    .from("coaching_relationships")
    .select("*")
    .eq("specialist_id", specialistId)
    .in("status", OPEN_STATUSES)
    .order("invited_at", { ascending: false });
  if (error) return failure(error.message, "Could not load your roster.");
  return { ok: true, data: (data as CoachingRelationshipRow[]).map(mapCoachingRelationship) };
}

/** Pending invites, connection requests, and active coaches for the signed-in client. */
export async function fetchClientCoaching(
  supabase: SupabaseClient,
  clientUserId: string
): Promise<CoachingResult<CoachingRelationship[]>> {
  const { data, error } = await supabase
    .from("coaching_relationships")
    .select("*")
    .eq("client_user_id", clientUserId)
    .in("status", OPEN_STATUSES)
    .order("invited_at", { ascending: false });
  if (error) return failure(error.message, "Could not load your coaches.");
  return { ok: true, data: (data as CoachingRelationshipRow[]).map(mapCoachingRelationship) };
}

export async function fetchClientCoachWorkouts(
  supabase: SupabaseClient,
  clientUserId: string
): Promise<CoachingResult<CoachWorkout[]>> {
  const { data, error } = await supabase
    .from("coach_workouts")
    .select("*")
    .eq("client_user_id", clientUserId)
    .order("date_key", { ascending: true });
  if (error) return failure(error.message, "Could not load workouts from your coach.");
  return { ok: true, data: (data as CoachWorkoutRow[]).map(mapCoachWorkout) };
}

export async function fetchSpecialistCoachWorkouts(
  supabase: SupabaseClient,
  specialistId: string
): Promise<CoachingResult<CoachWorkout[]>> {
  const { data, error } = await supabase
    .from("coach_workouts")
    .select("*")
    .eq("specialist_id", specialistId)
    .order("date_key", { ascending: false });
  if (error) return failure(error.message, "Could not load sent workouts.");
  return { ok: true, data: (data as CoachWorkoutRow[]).map(mapCoachWorkout) };
}

export async function fetchRelationshipForConversation(
  supabase: SupabaseClient,
  conversationId: string
): Promise<CoachingRelationship | null> {
  const { data } = await supabase
    .from("coaching_relationships")
    .select("*")
    .eq("conversation_id", conversationId)
    .maybeSingle();
  return data ? mapCoachingRelationship(data as CoachingRelationshipRow) : null;
}

/** A client who has messaged this specialist — roster photos and Add client candidates. */
export interface SpecialistInquiryContact {
  conversationId: string;
  clientUserId: string;
  firstName: string;
  avatarUrl: string;
  lastMessageAt: string;
}

const WELCOME_SOURCE = "smoac_welcome";

export async function fetchSpecialistInquiryContacts(
  supabase: SupabaseClient,
  specialistId: string
): Promise<CoachingResult<SpecialistInquiryContact[]>> {
  const { data, error } = await supabase
    .from("inquiry_conversations")
    .select("*")
    .eq("specialist_id", specialistId)
    .order("last_message_at", { ascending: false });
  if (error) return failure(error.message, "Could not load your inquiries.");
  const rows = (data ?? []) as InquiryConversationRow[];
  return {
    ok: true,
    data: rows
      .filter((row) => row.source !== WELCOME_SOURCE)
      .map((row) => ({
        conversationId: row.id,
        clientUserId: row.client_user_id,
        firstName: row.client_first_name?.trim() || "Client",
        avatarUrl: row.client_avatar_url?.trim() ?? "",
        lastMessageAt: row.last_message_at,
      })),
  };
}

export type CoachingInviteLinkStatus = "valid" | "accepted" | "claimed" | "expired" | "revoked";

export interface CoachingInvitePreview {
  specialistId: string;
  specialistName: string;
  clientFirstName: string;
  status: CoachingInviteLinkStatus;
}

/** Path of the public join page for an invite token. */
export function coachingInvitePath(token: string): string {
  return `/join/${encodeURIComponent(token)}`;
}

export async function createCoachingInviteLink(
  supabase: SupabaseClient,
  input: { specialistId: string; specialistName: string; clientFirstName: string }
): Promise<CoachingResult<{ token: string }>> {
  const { data, error } = await supabase.rpc("create_coaching_invite_link", {
    p_specialist_id: input.specialistId,
    p_specialist_name: input.specialistName,
    p_client_first_name: input.clientFirstName,
  });
  const token = (data as { token?: string } | null)?.token;
  if (error || !token) return failure(error?.message, "Could not create the invite link.");
  return { ok: true, data: { token } };
}

/** Works signed out — powers the join page. Null when the token doesn't exist. */
export async function fetchCoachingInvitePreview(
  supabase: SupabaseClient,
  token: string
): Promise<CoachingInvitePreview | null> {
  const { data, error } = await supabase.rpc("get_coaching_invite_link", { p_token: token });
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) return null;
  return {
    specialistId: String(row.specialist_id ?? ""),
    specialistName: String(row.specialist_name ?? ""),
    clientFirstName: String(row.client_first_name ?? ""),
    status: row.status as CoachingInviteLinkStatus,
  };
}

const CLAIM_ERRORS: Record<string, string> = {
  invite_invalid: "This invite link is no longer active.",
  invite_claimed: "This invite link was already used by someone else.",
  invite_expired: "This invite link has expired. Ask your specialist for a new one.",
  own_invite: "This is your own invite link. Open it on your client’s phone instead.",
};

export async function claimCoachingInviteLink(
  supabase: SupabaseClient,
  token: string
): Promise<CoachingResult<CoachingRelationship>> {
  const { data, error } = await supabase.rpc("claim_coaching_invite_link", { p_token: token });
  if (error || !data) {
    const code = Object.keys(CLAIM_ERRORS).find((key) => error?.message.includes(key));
    return { ok: false, message: code ? CLAIM_ERRORS[code]! : "Could not accept the invite." };
  }
  return { ok: true, data: mapCoachingRelationship(data as CoachingRelationshipRow) };
}

export async function respondRosterInvite(
  supabase: SupabaseClient,
  relationshipId: string,
  accept: boolean
): Promise<CoachingResult<CoachingRelationship>> {
  const { data, error } = await supabase.rpc("respond_roster_invite", {
    p_relationship_id: relationshipId,
    p_accept: accept,
  });
  if (error || !data) return failure(error?.message, "Could not update the invite.");
  return { ok: true, data: mapCoachingRelationship(data as CoachingRelationshipRow) };
}

export async function endCoaching(
  supabase: SupabaseClient,
  relationshipId: string
): Promise<CoachingResult<CoachingRelationship>> {
  const { data, error } = await supabase.rpc("end_coaching", {
    p_relationship_id: relationshipId,
  });
  if (error || !data) return failure(error?.message, "Could not end coaching.");
  return { ok: true, data: mapCoachingRelationship(data as CoachingRelationshipRow) };
}

export async function deleteCoachWorkout(
  supabase: SupabaseClient,
  workoutId: string
): Promise<CoachingResult<null>> {
  const { error } = await supabase.rpc("delete_coach_workout", { p_workout_id: workoutId });
  if (error) return failure(error.message, "Only workouts the client hasn’t started can be removed.");
  return { ok: true, data: null };
}

export async function markCoachWorkoutCompletionSeen(
  supabase: SupabaseClient,
  workoutId: string
): Promise<CoachingResult<CoachWorkout>> {
  const { data, error } = await supabase.rpc("mark_coach_workout_completion_seen", {
    p_workout_id: workoutId,
  });
  if (error || !data) return failure(error?.message, "Could not dismiss that notice.");
  return { ok: true, data: mapCoachWorkout(data as CoachWorkoutRow) };
}

export async function updateCoachWorkoutProgress(
  supabase: SupabaseClient,
  workoutId: string,
  status: Exclude<CoachWorkoutStatus, "sent">,
  clientLog: ClientWorkoutExercise[]
): Promise<CoachingResult<CoachWorkout>> {
  const { data, error } = await supabase.rpc("update_coach_workout_progress", {
    p_workout_id: workoutId,
    p_status: status,
    p_client_log: clientLog,
  });
  if (error || !data) return failure(error?.message, "Could not share your progress.");
  return { ok: true, data: mapCoachWorkout(data as CoachWorkoutRow) };
}

export interface SendCoachWorkoutInput {
  relationshipId: string;
  dateKey: string;
  title: string;
  note: string;
  exercises: ClientWorkoutExercise[];
}

export interface UpdateCoachWorkoutInput {
  workoutId: string;
  dateKey: string;
  title: string;
  note: string;
  exercises: ClientWorkoutExercise[];
}

/** Browser → API route (sends the email after the insert). */
export async function requestSendCoachWorkout(
  input: SendCoachWorkoutInput
): Promise<CoachingResult<CoachWorkout>> {
  return postJson<CoachWorkout>("/api/coaching/workouts", input, "Could not send the workout.");
}

/** Browser → API route. Only a workout the client has not started can change. */
export async function requestUpdateCoachWorkout(
  input: UpdateCoachWorkoutInput
): Promise<CoachingResult<CoachWorkout>> {
  return postJson<CoachWorkout>(
    "/api/coaching/workouts",
    input,
    "Could not save the workout.",
    "PATCH"
  );
}

/** Browser → API route: accept an invite or claim a link, then email both sides. */
export async function requestAcceptCoaching(
  input: { relationshipId: string } | { token: string }
): Promise<CoachingResult<CoachingRelationship>> {
  return postJson<CoachingRelationship>("/api/coaching/accept", input, "Could not accept the invite.");
}

/** Browser → API route (emails the client the invite). */
export async function requestRosterInvite(
  conversationId: string
): Promise<CoachingResult<CoachingRelationship>> {
  return postJson<CoachingRelationship>(
    "/api/coaching/invite",
    { conversationId },
    "Could not send the invite."
  );
}

export interface SpecialistConnectMatch {
  id: string;
  slug: string;
  businessName: string;
  fullName: string;
  profession: string;
  city: string;
  neighborhood: string;
  imageUrl: string;
}

interface SpecialistConnectMatchRow {
  id?: string;
  slug?: string | null;
  business_name?: string | null;
  full_name?: string | null;
  profession?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  image_url?: string | null;
}

/** Approved specialists whose full name or business name matches. */
export async function searchSpecialistsToConnect(
  supabase: SupabaseClient,
  query: string
): Promise<CoachingResult<SpecialistConnectMatch[]>> {
  const q = query.trim();
  if (q.length < 2) return { ok: true, data: [] };
  const { data, error } = await supabase.rpc("search_specialists_to_connect", { p_query: q });
  if (error) {
    if (error.message.includes("search_specialists_to_connect")) {
      return { ok: false, message: "Search isn’t available yet." };
    }
    return failure(error.message, "Could not search specialists.");
  }
  const rows = (Array.isArray(data) ? data : []) as SpecialistConnectMatchRow[];
  return {
    ok: true,
    data: rows
      .map((row) => ({
        id: String(row.id ?? "").trim(),
        slug: String(row.slug ?? "").trim(),
        businessName: String(row.business_name ?? "").trim(),
        fullName: String(row.full_name ?? "").trim(),
        profession: String(row.profession ?? "").trim(),
        city: String(row.city ?? "").trim(),
        neighborhood: String(row.neighborhood ?? "").trim(),
        imageUrl: String(row.image_url ?? "").trim(),
      }))
      .filter((row) => row.id),
  };
}

/** Browser → API route. Emails the specialist when the request is new. */
export async function requestSpecialistConnection(
  specialistId: string
): Promise<CoachingResult<CoachingRelationship>> {
  return postJson<CoachingRelationship>(
    "/api/coaching/connect",
    { specialistId },
    "Couldn’t send the request."
  );
}

/** Browser → API route. Accepting emails the client; declining does not. */
export async function requestRespondCoachingConnection(
  relationshipId: string,
  accept: boolean
): Promise<CoachingResult<CoachingRelationship>> {
  return postJson<CoachingRelationship>(
    "/api/coaching/connect/respond",
    { relationshipId, accept },
    accept ? "Couldn’t accept the request." : "Couldn’t decline the request."
  );
}

async function postJson<T>(
  url: string,
  body: unknown,
  fallback: string,
  method: "POST" | "PATCH" = "POST"
): Promise<CoachingResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json().catch(() => null)) as CoachingResult<T> | null;
    if (!json) return { ok: false, message: fallback };
    return json;
  } catch {
    return { ok: false, message: fallback };
  }
}
