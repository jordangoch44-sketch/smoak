import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { sanitizeClientWorkoutLog } from "@/lib/workouts/client-workout";
import {
  DEFAULT_WORKOUT_EMAIL_TIME_ZONE,
  dueWorkoutEmails,
  wallClockIn,
  type DueWorkoutEmail,
  type WorkoutEmailKind,
} from "@/lib/workouts/client-workout-email-rules";
import { sendClientWorkoutEmail } from "@/lib/email/client-workout-email-service";

const PAGE_SIZE = 500;
const UNIQUE_VIOLATION = "23505";

export type WorkoutEmailCounts = Record<WorkoutEmailKind, number>;

interface LogRow {
  user_id: string;
  log: unknown;
}

async function loadLogs(service: SupabaseClient): Promise<LogRow[]> {
  const rows: LogRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await service
      .from("client_workout_logs")
      .select("user_id, log")
      .order("user_id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.warn("[client-workout-emails] log query failed:", error.message);
      break;
    }
    rows.push(...((data ?? []) as LogRow[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

/** Keeps `.in()` filters short enough for the request URL. */
function chunks<T>(items: T[], size = 200): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
}

async function optedOutUserIds(service: SupabaseClient, userIds: string[]): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const batch of chunks(userIds)) {
    const { data } = await service
      .from("client_email_preferences")
      .select("user_id")
      .eq("workout_emails", false)
      .in("user_id", batch);
    for (const row of data ?? []) ids.add(String(row.user_id));
  }
  return ids;
}

async function globallyUnsubscribed(service: SupabaseClient): Promise<Set<string>> {
  const { data } = await service.from("admin_email_unsubscribes").select("email");
  return new Set((data ?? []).map((row) => String(row.email ?? "").trim().toLowerCase()));
}

async function profilesFor(
  service: SupabaseClient,
  userIds: string[]
): Promise<Map<string, { email: string; firstName: string }>> {
  const profiles = new Map<string, { email: string; firstName: string }>();
  for (const batch of chunks(userIds)) {
    const { data } = await service
      .from("profiles")
      .select("user_id, email, first_name")
      .in("user_id", batch);
    for (const row of data ?? []) {
      const email = String(row.email ?? "").trim().toLowerCase();
      if (!email.includes("@")) continue;
      profiles.set(String(row.user_id), {
        email,
        firstName: String(row.first_name ?? "").trim(),
      });
    }
  }
  return profiles;
}

/** Insert the ledger row first so overlapping runs can't both send. */
async function claim(
  service: SupabaseClient,
  userId: string,
  email: DueWorkoutEmail
): Promise<boolean> {
  const { error } = await service.from("client_workout_email_sends").insert({
    user_id: userId,
    kind: email.kind,
    period_key: email.periodKey,
  });
  if (!error) return true;
  if (error.code !== UNIQUE_VIOLATION) {
    console.warn("[client-workout-emails] claim failed:", error.message);
  }
  return false;
}

async function release(service: SupabaseClient, userId: string, email: DueWorkoutEmail) {
  await service
    .from("client_workout_email_sends")
    .delete()
    .eq("user_id", userId)
    .eq("kind", email.kind)
    .eq("period_key", email.periodKey);
}

/** Hourly: streak milestones, Friday/Saturday at-risk nudges, Sunday recaps — in each client's time zone. */
export async function sendDueClientWorkoutEmails(now: Date = new Date()): Promise<WorkoutEmailCounts> {
  const counts: WorkoutEmailCounts = {
    streak_milestone: 0,
    streak_at_risk: 0,
    weekly_recap: 0,
  };
  const service = createSupabaseServiceClient();
  if (!service) return counts;

  const rows = await loadLogs(service);
  if (rows.length === 0) return counts;

  const due = rows
    .map((row) => {
      const log = sanitizeClientWorkoutLog(row.log);
      const localNow = wallClockIn(log.timeZone ?? DEFAULT_WORKOUT_EMAIL_TIME_ZONE, now);
      return { userId: row.user_id, emails: dueWorkoutEmails(log, localNow) };
    })
    .filter((entry) => entry.emails.length > 0);
  if (due.length === 0) return counts;

  const userIds = due.map((entry) => entry.userId);
  const [optedOut, unsubscribed, profiles] = await Promise.all([
    optedOutUserIds(service, userIds),
    globallyUnsubscribed(service),
    profilesFor(service, userIds),
  ]);

  for (const { userId, emails } of due) {
    if (optedOut.has(userId)) continue;
    const profile = profiles.get(userId);
    if (!profile || unsubscribed.has(profile.email)) continue;

    for (const email of emails) {
      if (!(await claim(service, userId, email))) continue;
      const sent = await sendClientWorkoutEmail({ userId, ...profile }, email);
      if (sent.success) counts[email.kind] += 1;
      else await release(service, userId, email);
    }
  }

  return counts;
}
