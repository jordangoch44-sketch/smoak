import {
  CLIENT_DASHBOARD_PATH,
  SPECIALIST_DASHBOARD_CLIENTS_HREF,
  WORKOUTS_PATH,
} from "@/lib/auth-routes";
import { sendUserPush } from "@/lib/push/send-user-push";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

function person(name: string, fallback: string): string {
  const trimmed = name.trim();
  return trimmed || fallback;
}

export async function sendRosterInvitePush(input: {
  clientUserId: string;
  specialistName: string;
  relationshipId: string;
}): Promise<void> {
  const coach = person(input.specialistName, "A specialist");
  await sendUserPush({
    userId: input.clientUserId,
    title: "Coaching invite",
    body: `${coach} invited you to their roster`,
    path: CLIENT_DASHBOARD_PATH,
    collapseId: input.relationshipId,
  });
}

export async function sendCoachWorkoutPush(input: {
  clientUserId: string;
  specialistName: string;
  workoutId: string;
}): Promise<void> {
  const coach = person(input.specialistName, "Your coach");
  await sendUserPush({
    userId: input.clientUserId,
    title: "New workout",
    body: `${coach} sent you a workout`,
    path: WORKOUTS_PATH,
    collapseId: input.workoutId,
  });
}

export async function sendCoachingRequestPush(input: {
  specialistUserId: string;
  clientFirstName: string;
  relationshipId: string;
}): Promise<void> {
  const client = person(input.clientFirstName, "A client");
  await sendUserPush({
    userId: input.specialistUserId,
    title: "Connection request",
    body: `${client} wants to connect`,
    path: SPECIALIST_DASHBOARD_CLIENTS_HREF,
    collapseId: input.relationshipId,
  });
}

export async function sendRosterJoinedPush(input: {
  specialistUserId: string;
  clientFirstName: string;
  relationshipId: string;
}): Promise<void> {
  const client = person(input.clientFirstName, "A client");
  await sendUserPush({
    userId: input.specialistUserId,
    title: "New client",
    body: `${client} joined your roster`,
    path: SPECIALIST_DASHBOARD_CLIENTS_HREF,
    collapseId: input.relationshipId,
  });
}

/**
 * One alert when the client finishes a workout this specialist sent.
 * A second finish of the same workout does not send again.
 */
export async function sendCoachWorkoutFinishedPush(input: {
  clientUserId: string;
  workoutId: string;
}): Promise<void> {
  const workoutId = input.workoutId.trim();
  const clientUserId = input.clientUserId.trim();
  if (!workoutId || !clientUserId) return;

  const service = createSupabaseServiceClient();
  if (!service) return;

  const { data: workout, error } = await service
    .from("coach_workouts")
    .select("id, title, relationship_id, status, completion_notified_at")
    .eq("id", workoutId)
    .eq("client_user_id", clientUserId)
    .maybeSingle();
  if (error || !workout || workout.status !== "completed" || workout.completion_notified_at) {
    return;
  }

  const { data: relationship } = await service
    .from("coaching_relationships")
    .select("specialist_user_id, client_first_name")
    .eq("id", workout.relationship_id)
    .maybeSingle();
  const specialistUserId = String(relationship?.specialist_user_id ?? "").trim();
  if (!specialistUserId) return;

  const now = new Date().toISOString();
  const { data: claimed } = await service
    .from("coach_workouts")
    .update({ completion_notified_at: now })
    .eq("id", workoutId)
    .eq("client_user_id", clientUserId)
    .eq("status", "completed")
    .is("completion_notified_at", null)
    .select("id")
    .maybeSingle();
  if (!claimed) return;

  const client = person(String(relationship?.client_first_name ?? ""), "Your client");
  const title = String(workout.title ?? "").trim() || "a workout";
  await sendUserPush({
    userId: specialistUserId,
    title: "Workout finished",
    body: `${client} finished ${title}`,
    path: SPECIALIST_DASHBOARD_CLIENTS_HREF,
    collapseId: workoutId,
  });
}
