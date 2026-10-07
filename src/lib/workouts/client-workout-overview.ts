import type {
  ClientWorkoutDay,
  ClientWorkoutExercise,
  ClientWorkoutLog,
} from "@/types/client-workout";
import {
  addDays,
  bestWeekStreak,
  currentWeekStreak,
  formatBodyWeight,
  hasStrengthOnDay,
  isWorkoutDateKey,
  startOfWeekSunday,
  toLocalDateKey,
} from "@/lib/workouts/client-workout";

/** Weeks of history used for "not logged yet" and "most sets in N weeks". */
const LOOKBACK_WEEKS = 4;

export interface WeekTotals {
  sets: number;
  cardioMinutes: number;
}

export interface WeekDelta {
  direction: "up" | "down" | "same" | "none";
  text: string;
  /** Neither direction is good or bad (body weight) — no green/red. */
  neutral?: boolean;
}

export interface WeekOverviewStat {
  id: "weight" | "streak" | "cardio";
  value: string;
  label: string;
  delta: WeekDelta;
}

export interface BodyWeightEntry {
  dateKey: string;
  weight: number;
}

/** Weigh-ins newest first, optionally only those on or before a date. */
export function bodyWeightEntries(
  log: ClientWorkoutLog,
  onOrBeforeKey?: string
): BodyWeightEntry[] {
  return Object.entries(log.bodyWeights)
    .filter(([dateKey]) => !onOrBeforeKey || dateKey <= onOrBeforeKey)
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([dateKey, weight]) => ({ dateKey, weight }));
}

function latestBodyWeight(log: ClientWorkoutLog, onOrBeforeKey: string): number | null {
  return bodyWeightEntries(log, onOrBeforeKey)[0]?.weight ?? null;
}

/** Current weight against the last weigh-in before this week. */
function bodyWeightStat(log: ClientWorkoutLog, today: Date, weekStart: Date): WeekOverviewStat {
  const current = latestBodyWeight(log, toLocalDateKey(today));
  const before = latestBodyWeight(log, toLocalDateKey(addDays(weekStart, -1)));
  let delta: WeekDelta = { direction: "none", text: "Tap to log", neutral: true };
  if (current !== null && before !== null) {
    const diff = Math.round((current - before) * 10) / 10;
    delta =
      diff === 0
        ? { direction: "same", text: "Same", neutral: true }
        : {
            direction: diff > 0 ? "up" : "down",
            text: `${formatBodyWeight(Math.abs(diff))} lb`,
            neutral: true,
          };
  } else if (current !== null) {
    delta = { direction: "none", text: "Tap to update", neutral: true };
  }
  return {
    id: "weight",
    value: current === null ? "—" : formatBodyWeight(current),
    label: "lb weight",
    delta,
  };
}

/** Weeks in a row the goal was met, with the all-time best underneath. */
function streakStat(log: ClientWorkoutLog, today: Date): WeekOverviewStat {
  const streak = currentWeekStreak(log, today);
  const best = Math.max(streak, bestWeekStreak(log, today));
  let text = `Best ${best} wk`;
  if (best === 0) text = "Hit your goal";
  else if (streak === best) text = "Personal best";
  return {
    id: "streak",
    value: String(streak),
    label: "wk streak",
    delta: { direction: "none", text, neutral: true },
  };
}

export interface WeekOverview {
  rangeLabel: string;
  stats: WeekOverviewStat[];
  /** Best moment of the week, e.g. a PR. Null when nothing is logged. */
  highlight: string | null;
  /** Workout names this week plus names from recent weeks not trained yet. */
  split: string | null;
}

function toNumber(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function exerciseKey(exercise: ClientWorkoutExercise): string {
  return exercise.name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function exerciseSetCount(exercise: ClientWorkoutExercise): number {
  if (exercise.setLogs?.length) return exercise.setLogs.length;
  const sets = Number.parseInt(exercise.sets, 10);
  return Number.isFinite(sets) && sets > 0 ? sets : 0;
}

export function exerciseTopWeight(exercise: ClientWorkoutExercise): number {
  return (exercise.setLogs ?? []).reduce(
    (best, log) => Math.max(best, toNumber(log.weight)),
    0
  );
}

function exerciseReps(exercise: ClientWorkoutExercise): number {
  if (exercise.setLogs?.length) {
    return exercise.setLogs.reduce((sum, log) => {
      const reps = Number.parseInt(log.reps, 10);
      return sum + (Number.isFinite(reps) && reps > 0 ? reps : 0);
    }, 0);
  }
  const reps = Number.parseInt(exercise.reps, 10);
  const sets = exerciseSetCount(exercise);
  if (!Number.isFinite(reps) || reps <= 0 || sets <= 0) return 0;
  return reps * sets;
}

/** Reads minutes out of free-text durations: "30 min", "1 hr", "1h 15m", "1:30", "45". */
export function parseCardioMinutes(duration: string): number {
  const text = duration.trim().toLowerCase();
  if (!text) return 0;
  const clock = text.match(/^(\d+):(\d{1,2})$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const hours = text.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/);
  const minutes = text.match(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/);
  if (hours || minutes) {
    return Math.round(
      (hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0)
    );
  }
  const bare = text.match(/^(\d+(?:\.\d+)?)$/);
  return bare ? Math.round(Number(bare[1])) : 0;
}

function daysInWeek(log: ClientWorkoutLog, weekStart: Date): ClientWorkoutDay[] {
  const days: ClientWorkoutDay[] = [];
  for (let index = 0; index < 7; index += 1) {
    const day = log.days[toLocalDateKey(addDays(weekStart, index))];
    if (day) days.push(day);
  }
  return days;
}

export function weekTotals(log: ClientWorkoutLog, weekStart: Date): WeekTotals {
  const totals: WeekTotals = { sets: 0, cardioMinutes: 0 };
  for (const day of daysInWeek(log, weekStart)) {
    for (const exercise of day.exercises) {
      totals.sets += exerciseSetCount(exercise);
    }
    if (day.cardio) totals.cardioMinutes += parseCardioMinutes(day.cardio.duration);
  }
  return totals;
}

function formatWeight(weight: number): string {
  return `${formatBodyWeight(weight)} lb`;
}

function countDelta(current: number, previous: number, unit = ""): WeekDelta {
  if (previous <= 0 && current <= 0) return { direction: "none", text: "—" };
  const diff = current - previous;
  if (diff === 0) return { direction: "same", text: "Same" };
  return { direction: diff > 0 ? "up" : "down", text: `${Math.abs(diff)}${unit}` };
}

function formatRangeLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  const start = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const finish = end.toLocaleDateString(
    "en-US",
    sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" }
  );
  return `${start} – ${finish}`;
}

interface TopLift {
  name: string;
  weight: number;
  previous: number;
}

/** Heaviest set per exercise this week against the best before this week. */
function topLifts(log: ClientWorkoutLog, weekStart: Date): TopLift[] {
  const startKey = toLocalDateKey(weekStart);
  const endKey = toLocalDateKey(addDays(weekStart, 6));
  const before = new Map<string, number>();
  const during = new Map<string, TopLift>();

  for (const [dateKey, day] of Object.entries(log.days)) {
    if (!isWorkoutDateKey(dateKey) || dateKey > endKey) continue;
    const inWeek = dateKey >= startKey;
    for (const exercise of day.exercises) {
      const weight = exerciseTopWeight(exercise);
      if (weight <= 0) continue;
      const key = exerciseKey(exercise);
      if (!inWeek) {
        before.set(key, Math.max(before.get(key) ?? 0, weight));
        continue;
      }
      const current = during.get(key);
      if (!current || weight > current.weight) {
        during.set(key, { name: exercise.name.trim(), weight, previous: 0 });
      }
    }
  }

  return [...during.entries()].map(([key, lift]) => ({
    ...lift,
    previous: before.get(key) ?? 0,
  }));
}

export interface WeekRecapTopSet {
  name: string;
  weightLb: number;
  /** Pounds above the previous best. 0 when this lift is not a PR. */
  prGainLb: number;
}

/** Numbers the Sunday recap email draws. */
export interface WeekRecapFigures {
  /** Biggest PR this week, or the heaviest set when nothing was a PR. */
  topSet: WeekRecapTopSet | null;
  sets: number;
  reps: number;
  cardioMinutes: number;
  workouts: number;
  /** Latest weigh-in on or before the end of the week. */
  weightLb: number | null;
  /** Recent weigh-ins, oldest first, for the weight sparkline. */
  weightSeries: number[];
}

function featuredLift(lifts: TopLift[]): TopLift | null {
  const prs = lifts
    .filter((lift) => lift.previous > 0 && lift.weight > lift.previous)
    .sort((a, b) => b.weight - b.previous - (a.weight - a.previous));
  if (prs[0]) return prs[0];
  return [...lifts].sort((a, b) => b.weight - a.weight)[0] ?? null;
}

export function weekRecapFigures(log: ClientWorkoutLog, weekStart: Date): WeekRecapFigures {
  const totals = weekTotals(log, weekStart);
  const lift = featuredLift(topLifts(log, weekStart));
  const endKey = toLocalDateKey(addDays(weekStart, 6));
  const entries = bodyWeightEntries(log, endKey);
  let reps = 0;
  let workouts = 0;
  for (let index = 0; index < 7; index += 1) {
    const dateKey = toLocalDateKey(addDays(weekStart, index));
    const day = log.days[dateKey];
    if (hasStrengthOnDay(log, dateKey)) workouts += 1;
    if (!day) continue;
    for (const exercise of day.exercises) reps += exerciseReps(exercise);
  }
  const gain =
    lift && lift.previous > 0 && lift.weight > lift.previous
      ? Math.round((lift.weight - lift.previous) * 10) / 10
      : 0;

  return {
    topSet: lift
      ? { name: lift.name, weightLb: lift.weight, prGainLb: gain }
      : null,
    sets: totals.sets,
    reps,
    cardioMinutes: totals.cardioMinutes,
    workouts,
    weightLb: entries[0]?.weight ?? null,
    weightSeries: entries
      .slice(0, 7)
      .map((entry) => entry.weight)
      .reverse(),
  };
}

/** Times any lift beat its previous heaviest set. A lift's first log is not a PR. */
export function personalRecordCount(log: ClientWorkoutLog): number {
  const best = new Map<string, number>();
  let count = 0;
  const keys = Object.keys(log.days).filter(isWorkoutDateKey).sort();
  for (const dateKey of keys) {
    const dayBest = new Map<string, number>();
    for (const exercise of log.days[dateKey].exercises) {
      const weight = exerciseTopWeight(exercise);
      if (weight <= 0) continue;
      const key = exerciseKey(exercise);
      dayBest.set(key, Math.max(dayBest.get(key) ?? 0, weight));
    }
    for (const [key, weight] of dayBest) {
      const previous = best.get(key);
      if (previous !== undefined && weight > previous) count += 1;
      if (previous === undefined || weight > previous) best.set(key, weight);
    }
  }
  return count;
}

function longestCardio(log: ClientWorkoutLog, weekStart: Date): number {
  return daysInWeek(log, weekStart).reduce(
    (best, day) => Math.max(best, day.cardio ? parseCardioMinutes(day.cardio.duration) : 0),
    0
  );
}

function weekHighlight(
  log: ClientWorkoutLog,
  weekStart: Date,
  totals: WeekTotals
): string | null {
  const lifts = topLifts(log, weekStart);
  const prs = lifts
    .filter((lift) => lift.previous > 0 && lift.weight > lift.previous)
    .sort((a, b) => b.weight - b.previous - (a.weight - a.previous));
  const pr = prs[0];
  if (pr) {
    return `🏆 ${pr.name} PR — ${formatWeight(pr.weight)} (was ${formatWeight(pr.previous)})`;
  }

  if (totals.sets > 0) {
    let weeksBeaten = 0;
    for (let back = 1; back <= LOOKBACK_WEEKS; back += 1) {
      const earlier = weekTotals(log, addDays(weekStart, -7 * back)).sets;
      if (earlier <= 0 || totals.sets <= earlier) break;
      weeksBeaten = back;
    }
    if (weeksBeaten >= 2) return `🔥 Most sets in ${weeksBeaten + 1} weeks`;
  }

  const cardio = longestCardio(log, weekStart);
  if (cardio > 0 && totals.sets === 0) {
    return `🏃 Longest cardio session: ${cardio} min`;
  }

  const heaviest = [...lifts].sort((a, b) => b.weight - a.weight)[0];
  if (heaviest) return `💪 Top set: ${heaviest.name} ${formatWeight(heaviest.weight)}`;
  if (cardio > 0) return `🏃 Longest cardio session: ${cardio} min`;
  return null;
}

function titleCounts(log: ClientWorkoutLog, weekStart: Date): Map<string, { label: string; count: number }> {
  const counts = new Map<string, { label: string; count: number }>();
  for (const day of daysInWeek(log, weekStart)) {
    const label = day.title.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    const entry = counts.get(key);
    counts.set(key, { label: entry?.label ?? label, count: (entry?.count ?? 0) + 1 });
  }
  return counts;
}

function weekSplit(log: ClientWorkoutLog, weekStart: Date): string | null {
  const thisWeek = titleCounts(log, weekStart);
  const parts = [...thisWeek.values()].map(({ label, count }) => `${label} ×${count}`);

  const missing = new Map<string, string>();
  for (let back = 1; back <= LOOKBACK_WEEKS; back += 1) {
    for (const [key, { label }] of titleCounts(log, addDays(weekStart, -7 * back))) {
      if (!thisWeek.has(key) && !missing.has(key)) missing.set(key, label);
    }
  }
  const firstMissing = [...missing.values()][0];
  if (firstMissing) parts.push(`${firstMissing} not logged yet`);

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function buildWeekOverview(
  log: ClientWorkoutLog,
  today: Date = new Date()
): WeekOverview {
  const weekStart = startOfWeekSunday(today);
  const current = weekTotals(log, weekStart);
  const previous = weekTotals(log, addDays(weekStart, -7));

  return {
    rangeLabel: formatRangeLabel(weekStart),
    stats: [
      bodyWeightStat(log, today, weekStart),
      streakStat(log, today),
      {
        id: "cardio",
        value: String(current.cardioMinutes),
        label: "cardio min",
        delta: countDelta(current.cardioMinutes, previous.cardioMinutes, " min"),
      },
    ],
    highlight: weekHighlight(log, weekStart, current),
    split: weekSplit(log, weekStart),
  };
}
