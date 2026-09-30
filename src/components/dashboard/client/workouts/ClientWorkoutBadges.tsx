"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useClientWorkouts } from "@/hooks/useClientWorkouts";
import { currentWeekStreak } from "@/lib/workouts/client-workout";
import { personalRecordCount } from "@/lib/workouts/client-workout-overview";

const noopSubscribe = () => () => {};

/** Header chips: goal streak and lifetime PRs. */
export function ClientWorkoutBadges({ userId }: { userId: string }) {
  const { log } = useClientWorkouts(userId);
  // Streak depends on today's date; build only in the browser.
  const inBrowser = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const badges = useMemo(() => {
    if (!inBrowser) return null;
    return { streak: currentWeekStreak(log), prs: personalRecordCount(log) };
  }, [log, inBrowser]);

  if (!badges) return <div className="client-dash-badges" aria-hidden />;

  const { streak, prs } = badges;
  return (
    <ul className="client-dash-badges" aria-label="Workout awards">
      <li className="client-dash-badge">
        <span aria-hidden>🔥</span>
        <span>{streak > 0 ? `${streak} wk streak` : "Start a streak"}</span>
      </li>
      <li className="client-dash-badge">
        <span aria-hidden>🏆</span>
        <span>
          {prs > 0 ? `${prs} ${prs === 1 ? "PR" : "PRs"}` : "No PRs yet"}
        </span>
      </li>
    </ul>
  );
}
