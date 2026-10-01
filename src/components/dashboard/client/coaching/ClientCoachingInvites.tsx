"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { useClientCoaching } from "@/hooks/useClientCoaching";
import { useClientWorkouts } from "@/hooks/useClientWorkouts";
import { useCoachWorkoutSync } from "@/hooks/useCoachWorkoutSync";
import { formatCoachName, isCoachWorkoutInLog } from "@/lib/coaching/coach-workout";
import {
  formatWorkoutDayHeading,
  parseLocalDateKey,
  toLocalDateKey,
} from "@/lib/workouts/client-workout";
import type { CoachingRelationship } from "@/types/coaching";
import { ClientWorkoutsModal } from "../workouts/ClientWorkoutsModal";
import "@/styles/coaching.css";

const noopSubscribe = () => () => {};
/** Missed coach workouts stay on the dashboard this many days before dropping off. */
const NOTICE_GRACE_DAYS = 3;

/**
 * Coaching on the client dashboard: roster invites, new workouts from a coach,
 * and the background sync that shares progress back. Renders nothing when idle.
 */
export function ClientCoachingInvites({ userId }: { userId: string }) {
  const { invites, respond } = useClientCoaching(userId);
  useCoachWorkoutSync(userId);
  return (
    <>
      {invites.length > 0 ? (
        <div className="coaching-invites">
          {invites.map((invite) => (
            <InviteCard key={invite.id} invite={invite} onRespond={respond} />
          ))}
        </div>
      ) : null}
      <NewCoachWorkoutsNotice userId={userId} />
    </>
  );
}

function NewCoachWorkoutsNotice({ userId }: { userId: string }) {
  const { workouts, coachNameFor } = useClientCoaching(userId);
  const { log } = useClientWorkouts(userId);
  const inBrowser = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [openDateKey, setOpenDateKey] = useState<string | null>(null);

  const notice = useMemo(() => {
    if (!inBrowser) return null;
    const today = new Date();
    const todayKey = toLocalDateKey(today);
    const cutoff = toLocalDateKey(
      new Date(today.getFullYear(), today.getMonth(), today.getDate() - NOTICE_GRACE_DAYS)
    );
    const pending = workouts
      .filter(
        (workout) =>
          workout.status === "sent" &&
          workout.dateKey >= cutoff &&
          !isCoachWorkoutInLog(workout, log.days)
      )
      .sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1));
    if (pending.length === 0) return null;
    return { todayKey, pending };
  }, [inBrowser, workouts, log.days]);

  if (!notice) return null;
  const next = notice.pending[0]!;
  const coachName = coachNameFor(next).trim();
  const eyebrow = coachName ? `From coach ${formatCoachName(coachName)}` : "From your coach";
  const when =
    next.dateKey === notice.todayKey
      ? "today"
      : next.dateKey < notice.todayKey
        ? `from ${formatWorkoutDayHeading(next.dateKey)}`
        : `for ${parseLocalDateKey(next.dateKey).toLocaleDateString("en-US", { weekday: "long" })}`;
  const more = notice.pending.length - 1;

  return (
    <>
      <section className="coaching-card coaching-card--notice" aria-label="New workout from your coach">
        <p className="coaching-card__eyebrow">{eyebrow}</p>
        <p className="coaching-card__title">
          {next.title || "Workout"} {when}
        </p>
        <p className="coaching-card__copy">
          {next.exercises.length} exercises
          {more > 0 ? ` · ${more} more waiting in your calendar` : ""}
        </p>
        <div className="coaching-card__actions">
          <FastActivateButton
            className="coaching-btn coaching-btn--primary"
            onActivate={() => setOpenDateKey(next.dateKey)}
          >
            View workout
          </FastActivateButton>
        </div>
      </section>
      <ClientWorkoutsModal
        userId={userId}
        open={openDateKey !== null}
        initialDateKey={openDateKey}
        onClose={() => setOpenDateKey(null)}
      />
    </>
  );
}

function InviteCard({
  invite,
  onRespond,
}: {
  invite: CoachingRelationship;
  onRespond: (relationshipId: string, accept: boolean) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const coach = invite.specialistName.trim() || "A specialist";

  async function answer(accept: boolean) {
    setBusy(true);
    setError(null);
    const ok = await onRespond(invite.id, accept);
    setBusy(false);
    if (!ok) setError("Couldn’t update the invite. Try again.");
  }

  return (
    <section className="coaching-card" aria-label={`Invite from ${coach}`}>
      <p className="coaching-card__eyebrow">Coaching invite</p>
      <p className="coaching-card__title">{coach} wants to add you to their roster</p>
      <p className="coaching-card__copy">
        They’ll be able to send workouts to your calendar. They only see the workouts they
        send you.
      </p>
      {error ? <p className="coaching-error">{error}</p> : null}
      <div className="coaching-card__actions">
        <FastActivateButton
          className="coaching-btn coaching-btn--primary"
          disabled={busy}
          onActivate={() => void answer(true)}
        >
          Accept
        </FastActivateButton>
        <FastActivateButton
          className="coaching-btn"
          disabled={busy}
          onActivate={() => void answer(false)}
        >
          Decline
        </FastActivateButton>
      </div>
    </section>
  );
}
