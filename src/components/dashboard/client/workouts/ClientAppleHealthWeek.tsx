"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { SmoacLoader } from "@/components/brand/SmoacLoader";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { ChevronRightIcon, HeartIcon } from "@/components/ui/icons";
import { lockOverlayDocumentScroll } from "@/lib/lock-overlay-scroll";
import {
  appleHealthQueryRange,
  appleHealthWorkoutsOnDate,
  buildAppleHealthWeek,
  formatAppleHealthDayLine,
  formatAppleHealthSummary,
  formatAppleHealthWorkoutDetail,
  isIosApp,
  subscribeIosApp,
} from "@/lib/health/apple-health";
import {
  connectAppleHealth,
  getAppleHealthServerSnapshot,
  getAppleHealthSnapshot,
  refreshAppleHealth,
  subscribeAppleHealth,
} from "@/lib/health/apple-health-store";

function HealthFlameIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.2 2.2c.2 2.4-1.4 3.8-2.3 5.4.4-1.7-.4-2.8-1.1-4 2.2 2.4 3.4 4.6 2.2 7.2-1.6-.8-2.2-2.2-2.4-3.4-1.8 1.6-2.8 3.6-2.8 5.8 0 3.7 2.9 6.6 6.6 6.6s6.6-3 6.6-6.8c0-4.4-3.4-6.8-6.8-10.8z" />
    </svg>
  );
}

function HealthRunnerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="15" cy="4.7" r="1.55" fill="currentColor" stroke="none" />
      <path d="M8 20.4l2.3-4.5 2.7-1.3 1.5 3.1 3.1 1.5" />
      <path d="M10.2 15.8 8 12.8l3.3-2.2 3.6 1.4" />
    </svg>
  );
}

function HealthBarsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="3.2" y="12" width="4.4" height="8.2" rx="1.2" />
      <rect x="9.8" y="7.2" width="4.4" height="13" rx="1.2" />
      <rect x="16.4" y="3.6" width="4.4" height="16.6" rx="1.2" />
    </svg>
  );
}

function AppleHealthConnectingOverlay() {
  useEffect(() => lockOverlayDocumentScroll(), []);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="client-apple-health-connecting"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <SmoacLoader size="large" label="Connecting to Apple Health" />
    </div>,
    document.body
  );
}

/**
 * Optional Apple Health summary for the iPhone app.
 * Hidden on the website. Does not write the training journal.
 */
export function ClientAppleHealthWeek({
  month,
  today,
  onOpenDay,
}: {
  month: Date | null;
  today: Date | null;
  onOpenDay?: (dateKey: string) => void;
}) {
  const ios = useSyncExternalStore(subscribeIosApp, () => isIosApp(), () => false);
  const health = useSyncExternalStore(
    subscribeAppleHealth,
    getAppleHealthSnapshot,
    getAppleHealthServerSnapshot
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ios || !health.connected || !month || !today) return;
    const range = appleHealthQueryRange(month, today);
    const load = () => {
      void refreshAppleHealth(range.start.getTime(), range.end.getTime());
    };
    load();
    function onVisible() {
      if (document.visibilityState === "visible") load();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [ios, health.connected, month, today]);

  const week = useMemo(
    () => (today ? buildAppleHealthWeek(health.workouts, today) : null),
    [health.workouts, today]
  );

  if (!ios) return null;

  if (!health.connected) {
    if (health.dismissed) return null;
    const opening = busy || health.status === "loading";
    return (
      <section className="client-apple-health client-apple-health--connect" aria-label="Apple Health">
        <div className="client-apple-health__head">
          <span className="client-apple-health__mark" aria-hidden>
            <HeartIcon filled className="client-apple-health__heart" />
          </span>
          <div className="client-apple-health__copy">
            <p className="client-apple-health__eyebrow">Apple Health</p>
            <p className="client-apple-health__title">Connect Apple Health</p>
            <p className="client-apple-health__body">
              Sync your Apple Watch workouts and calories burned to this calendar.
            </p>
            {health.error ? <p className="client-apple-health__note">{health.error}</p> : null}
          </div>
          <button
            type="button"
            className="client-apple-health__connect"
            disabled={opening}
            onClick={() => {
              setBusy(true);
              void connectAppleHealth().finally(() => setBusy(false));
            }}
          >
            Connect
            {opening ? null : <ChevronRightIcon />}
          </button>
        </div>
        <ul className="client-apple-health__perks">
          <li className="client-apple-health__perk client-apple-health__perk--calories">
            <HealthFlameIcon />
            Calories
          </li>
          <li className="client-apple-health__perk client-apple-health__perk--sync">
            <HealthRunnerIcon />
            Workout Sync
          </li>
          <li className="client-apple-health__perk client-apple-health__perk--week">
            <HealthBarsIcon />
            Weekly Activity
          </li>
        </ul>
        {opening ? <AppleHealthConnectingOverlay /> : null}
      </section>
    );
  }

  return (
    <section className="client-apple-health" aria-label="Apple Health this week">
      <p className="client-apple-health__eyebrow">Apple Health · This week</p>
      {health.status === "loading" && health.workouts.length === 0 ? (
        <p className="client-apple-health__note">Reading workouts…</p>
      ) : null}
      {health.status === "error" && health.error ? (
        <p className="client-apple-health__note">{health.error}</p>
      ) : null}
      {week && week.workoutCount === 0 && health.status === "ready" ? (
        <>
          <p className="client-apple-health__summary">No workouts recorded this week.</p>
          <p className="client-apple-health__note">
            Access is managed in the Health app under Sharing → Apps.
          </p>
        </>
      ) : null}
      {week && week.workoutCount > 0 ? (
        <>
          <p className="client-apple-health__summary">{formatAppleHealthSummary(week)}</p>
          <ul className="client-apple-health__list">
            {week.days.flatMap((day) =>
              day.workouts.map((workout) => {
                const detail = formatAppleHealthWorkoutDetail(workout);
                const label = `${day.label}, ${workout.activityLabel}, ${detail}`;
                const body = (
                  <>
                    <span className="client-apple-health__day">{day.label}</span>
                    <span className="client-apple-health__name">{workout.activityLabel}</span>
                    <span className="client-apple-health__detail">{detail}</span>
                  </>
                );
                return (
                  <li key={workout.id}>
                    {onOpenDay ? (
                      <FastActivateButton
                        className="client-apple-health__row"
                        aria-label={label}
                        onActivate={() => onOpenDay(day.dateKey)}
                      >
                        {body}
                      </FastActivateButton>
                    ) : (
                      <div className="client-apple-health__row">{body}</div>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </>
      ) : null}
    </section>
  );
}

/** Read-only line on a journal day. Empty on the website and when that day has no workout. */
export function ClientAppleHealthDayNote({ dateKey }: { dateKey: string }) {
  const health = useSyncExternalStore(
    subscribeAppleHealth,
    getAppleHealthSnapshot,
    getAppleHealthServerSnapshot
  );
  const lines = appleHealthWorkoutsOnDate(health.workouts, dateKey);
  if (lines.length === 0) return null;
  return (
    <p className="client-workouts-day__health">
      {lines.map((workout) => (
        <span key={workout.id}>{formatAppleHealthDayLine(workout)}</span>
      ))}
    </p>
  );
}
