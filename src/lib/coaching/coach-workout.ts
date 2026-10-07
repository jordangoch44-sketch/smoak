import type { ClientWorkoutDay, ClientWorkoutExercise } from "@/types/client-workout";
import type {
  CoachingRelationship,
  CoachingRelationshipRow,
  CoachWorkout,
  CoachWorkoutRow,
  CoachWorkoutStatus,
} from "@/types/coaching";
import {
  addDays,
  parseLocalDateKey,
  sanitizeWorkoutExercises,
  startOfWeekSunday,
  toLocalDateKey,
} from "@/lib/workouts/client-workout";

export const COACH_NOTE_MAX_LENGTH = 500;

function toExercises(value: unknown): ClientWorkoutExercise[] {
  return Array.isArray(value) ? sanitizeWorkoutExercises(value as ClientWorkoutExercise[]) : [];
}

export function mapCoachingRelationship(row: CoachingRelationshipRow): CoachingRelationship {
  return {
    id: row.id,
    specialistId: row.specialist_id,
    specialistUserId: row.specialist_user_id,
    clientUserId: row.client_user_id,
    conversationId: row.conversation_id,
    specialistName: row.specialist_name,
    clientFirstName: row.client_first_name,
    status: row.status,
    invitedAt: row.invited_at,
    respondedAt: row.responded_at,
  };
}

export function mapCoachWorkout(row: CoachWorkoutRow): CoachWorkout {
  return {
    id: row.id,
    relationshipId: row.relationship_id,
    specialistId: row.specialist_id,
    clientUserId: row.client_user_id,
    dateKey: row.date_key,
    title: row.title,
    note: row.note,
    exercises: toExercises(row.exercises),
    status: row.status,
    clientLog: row.client_log == null ? null : toExercises(row.client_log),
    sentAt: row.sent_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    completionNotifiedAt: row.completion_notified_at ?? null,
    completionSeenAt: row.completion_seen_at ?? null,
  };
}

/**
 * Open specialist workouts through the end of this Sunday–Saturday week.
 * A finished workout drops off. The week reads completed once every workout
 * dated this week is done and nothing earlier is still open.
 */
export function coachWeekPlan(
  workouts: readonly CoachWorkout[],
  today: Date
): { open: CoachWorkout[]; completed: boolean } {
  const weekStart = startOfWeekSunday(today);
  const startKey = toLocalDateKey(weekStart);
  const endKey = toLocalDateKey(addDays(weekStart, 6));
  const open = workouts
    .filter((workout) => workout.status !== "completed" && workout.dateKey <= endKey)
    .slice()
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.title.localeCompare(b.title));
  const thisWeek = workouts.filter(
    (workout) => workout.dateKey >= startKey && workout.dateKey <= endKey
  );
  return {
    open,
    completed: thisWeek.length > 0 && thisWeek.every((workout) => workout.status === "completed") && open.length === 0,
  };
}

/** Calendar mark for a day that has coach workouts. */
export function coachDayMark(
  workouts: readonly CoachWorkout[] | undefined
): "open" | "done" | null {
  if (!workouts || workouts.length === 0) return null;
  return workouts.every((workout) => workout.status === "completed") ? "done" : "open";
}

/** How long a finished workout (and a new roster join) stays a notice. */
export const COACH_NOTICE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

const FINISHED_NOTICE_MS = COACH_NOTICE_WINDOW_MS;

const FINISHED_SEEN_KEY = "smoac.coach-finished-seen";

/** Browser fallback so Not now still clears the notice before the SQL columns exist. */
export function readLocalFinishedSeen(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(FINISHED_SEEN_KEY) || "[]") as unknown;
    return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function rememberLocalFinishedSeen(ids: readonly string[]) {
  if (typeof window === "undefined" || ids.length === 0) return;
  const next = [...new Set([...readLocalFinishedSeen(), ...ids])].slice(-200);
  window.localStorage.setItem(FINISHED_SEEN_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("smoac:coach-finished-seen"));
}

/** Completed coach workouts the specialist has not dismissed, from the last two weeks. */
export function unseenCoachCompletions(
  workouts: readonly CoachWorkout[],
  now = Date.now()
): CoachWorkout[] {
  return workouts.filter((workout) => {
    if (workout.status !== "completed" || workout.completionSeenAt) return false;
    const stamp = workout.completedAt ? Date.parse(workout.completedAt) : NaN;
    return Number.isFinite(stamp) && now - stamp <= FINISHED_NOTICE_MS;
  });
}

/**
 * Day sheet contents for a coach-sent day. Open workouts are already filled in,
 * keeping the coach exercise ids so Finish can match them back.
 */
export function coachDayForSheet(
  dateKey: string,
  day: ClientWorkoutDay | undefined,
  workouts: readonly CoachWorkout[]
): ClientWorkoutDay | undefined {
  const open = workouts.filter((workout) => workout.status !== "completed");
  if (open.length === 0) return day;
  const exercises = open.reduce(
    (list, workout) => appendCoachExercises(workout, list),
    day?.exercises ?? []
  );
  const unchanged =
    day != null &&
    exercises.length === day.exercises.length &&
    exercises.every((exercise, index) => exercise.id === day.exercises[index]?.id);
  if (unchanged) return day;
  return {
    date: dateKey,
    title: day?.title.trim() || open.find((workout) => workout.title.trim())?.title || "",
    exercises,
    ...(day?.cardio ? { cardio: day.cardio } : {}),
  };
}

export function sanitizeCoachNote(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, COACH_NOTE_MAX_LENGTH) : "";
}

/**
 * What the client has done on a coach workout, read from their day's exercises.
 * Started exercises keep the coach exercise ids, so only those are shared back.
 */
export function coachWorkoutProgress(
  workout: CoachWorkout,
  dayExercises: readonly ClientWorkoutExercise[]
): { status: CoachWorkoutStatus; clientLog: ClientWorkoutExercise[] } {
  const coachIds = new Set(workout.exercises.map((exercise) => exercise.id));
  const clientLog = dayExercises.filter((exercise) => coachIds.has(exercise.id));
  const done =
    clientLog.length === coachIds.size && clientLog.every((exercise) => exercise.completed);
  return { status: done ? "completed" : "started", clientLog };
}

/** Logged weights when the client has done the exercise, otherwise the plan. */
export function coachWorkoutHistoryExercises(
  workout: CoachWorkout
): ClientWorkoutExercise[] {
  const logged = workout.clientLog ?? [];
  if (logged.length === 0) return workout.exercises;
  const names = new Set(logged.map((exercise) => exercise.name.trim().toLowerCase()));
  return [
    ...logged,
    ...workout.exercises.filter(
      (exercise) => !names.has(exercise.name.trim().toLowerCase())
    ),
  ];
}

/**
 * Start a coach workout: append its exercises to a day's log, keeping the coach
 * exercise ids so progress can be matched back. Exercises already there are skipped.
 */
export function appendCoachExercises(
  workout: CoachWorkout,
  existing: readonly ClientWorkoutExercise[]
): ClientWorkoutExercise[] {
  const have = new Set(existing.map((exercise) => exercise.id));
  const added = workout.exercises
    .filter((exercise) => !have.has(exercise.id))
    .map(({ id, name, sets, reps, setLogs, note }) => ({
      id,
      name,
      sets,
      reps,
      ...(note?.trim() ? { note: note.trim() } : {}),
      ...(setLogs?.length
        ? {
            setLogs: setLogs.map((set) => ({
              reps: set.reps,
              weight: set.weight,
            })),
          }
        : {}),
    }));
  return [...existing, ...added];
}

/** True once any of the coach workout's exercises are in the client's log. */
export function isCoachWorkoutInLog(
  workout: CoachWorkout,
  days: Readonly<Record<string, ClientWorkoutDay>>
): boolean {
  const coachIds = new Set(workout.exercises.map((exercise) => exercise.id));
  return Object.values(days).some((day) =>
    day.exercises.some((exercise) => coachIds.has(exercise.id))
  );
}

/**
 * Progress to share back, read from the day holding the most of this workout's
 * exercises. Null when the client hasn't started it (or removed it from the log).
 */
export function coachProgressFromLog(
  workout: CoachWorkout,
  days: Readonly<Record<string, ClientWorkoutDay>>
): { status: Exclude<CoachWorkoutStatus, "sent">; clientLog: ClientWorkoutExercise[] } | null {
  const coachIds = new Set(workout.exercises.map((exercise) => exercise.id));
  let best: ClientWorkoutExercise[] = [];
  for (const day of Object.values(days)) {
    const matches = day.exercises.filter((exercise) => coachIds.has(exercise.id));
    if (matches.length > best.length) best = matches;
  }
  if (best.length === 0) return null;
  const progress = coachWorkoutProgress(workout, best);
  return {
    status: progress.status === "completed" ? "completed" : "started",
    clientLog: progress.clientLog,
  };
}

/** Stable comparison key for a status + client log pair. */
export function coachProgressSignature(
  status: CoachWorkoutStatus,
  clientLog: readonly ClientWorkoutExercise[] | null
): string {
  const log = (clientLog ?? []).map((exercise) => [
    exercise.id,
    Boolean(exercise.completed),
    exercise.sets,
    exercise.reps,
    exercise.note?.trim() ?? "",
    (exercise.setLogs ?? []).map(
      (set) => `${set.reps}|${set.weight}|${set.completed ? 1 : 0}`
    ),
  ]);
  return JSON.stringify([status, log]);
}

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_WEEKS = 4;
/** A new client stays "New" (not "Inactive") this long before their first finished workout. */
const NEW_CLIENT_DAYS = 14;
const INACTIVE_AFTER_DAYS = 7;

/** Roster filter + badge. Invited = waiting on the client; the rest are accepted clients. */
export type RosterClientState = "invited" | "new" | "active" | "inactive";

/** Colour of the dot on the avatar: trained lately, slipping, or quiet. */
export type RosterActivity = "recent" | "slipping" | "idle";

export interface RosterClientSummary {
  state: RosterClientState;
  activity: RosterActivity;
  /** "Last workout 2 days ago", "No workouts yet", or "Invite sent Sep 30". */
  lastLine: string;
  /** Finished coach workouts per week over the last 4 weeks, e.g. "3/wk". */
  perWeekLabel: string;
  /** Weeks since the client accepted, e.g. "8 weeks". */
  weeksLabel: string;
  completedCount: number;
  nextWorkout: CoachWorkout | null;
}

function workoutFinishedAt(workout: CoachWorkout): number | null {
  if (workout.status !== "completed") return null;
  const stamp = workout.completedAt ? Date.parse(workout.completedAt) : NaN;
  return Number.isFinite(stamp) ? stamp : parseLocalDateKey(workout.dateKey).getTime();
}

function daysAgoLabel(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function summarizeRosterClient(
  relationship: CoachingRelationship,
  workouts: readonly CoachWorkout[],
  now: Date,
  todayKey: string
): RosterClientSummary {
  const nowMs = now.getTime();
  const finished = workouts
    .map(workoutFinishedAt)
    .filter((stamp): stamp is number => stamp !== null);
  const lastFinished = finished.length > 0 ? Math.max(...finished) : null;
  const daysSince =
    lastFinished === null ? null : Math.max(0, Math.floor((nowMs - lastFinished) / DAY_MS));
  const recentCount = finished.filter((stamp) => nowMs - stamp <= RECENT_WEEKS * 7 * DAY_MS).length;
  const perWeekRaw = recentCount / RECENT_WEEKS;
  const perWeek = perWeekRaw > 0 && perWeekRaw < 1 ? "<1" : String(Math.round(perWeekRaw));

  const acceptedMs = relationship.respondedAt ? Date.parse(relationship.respondedAt) : NaN;
  const daysCoached = Number.isFinite(acceptedMs)
    ? Math.max(0, Math.floor((nowMs - acceptedMs) / DAY_MS))
    : 0;
  const weeks = Math.max(1, Math.ceil(daysCoached / 7));

  const nextWorkout =
    [...workouts]
      .filter((item) => item.dateKey >= todayKey && item.status !== "completed")
      .sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1))[0] ?? null;

  if (relationship.status === "invited") {
    const sent = new Date(relationship.invitedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return {
      state: "invited",
      activity: "idle",
      lastLine: `Invite sent ${sent}`,
      perWeekLabel: "0/wk",
      weeksLabel: "0 weeks",
      completedCount: 0,
      nextWorkout: null,
    };
  }

  const state: RosterClientState =
    daysSince !== null && daysSince <= INACTIVE_AFTER_DAYS
      ? "active"
      : daysSince === null && daysCoached <= NEW_CLIENT_DAYS
        ? "new"
        : "inactive";
  const activity: RosterActivity =
    daysSince === null ? "idle" : daysSince <= 2 ? "recent" : daysSince <= INACTIVE_AFTER_DAYS ? "slipping" : "idle";

  return {
    state,
    activity,
    lastLine: daysSince === null ? "No workouts yet" : `Last workout ${daysAgoLabel(daysSince)}`,
    perWeekLabel: `${perWeek}/wk`,
    weeksLabel: `${weeks} ${weeks === 1 ? "week" : "weeks"}`,
    completedCount: finished.length,
    nextWorkout,
  };
}

export const COACH_WORKOUT_STATUS_LABEL: Record<CoachWorkoutStatus, string> = {
  sent: "Sent",
  started: "In progress",
  completed: "Done",
};

export function formatCoachName(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.split(/\s+/)[0]! : "your coach";
}
