"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { CloseIcon } from "@/components/ui/icons";
import { useOwnPointerDismiss } from "@/hooks/useFastActivate";
import { useClientWorkouts } from "@/hooks/useClientWorkouts";
import { lockOverlayDocumentScroll } from "@/lib/lock-overlay-scroll";
import {
  formatBodyWeight,
  formatWorkoutDayHeading,
  sanitizeBodyWeight,
  toLocalDateKey,
} from "@/lib/workouts/client-workout";
import { bodyWeightEntries } from "@/lib/workouts/client-workout-overview";

/** Shares the workouts overlay lock so the iOS scroll rules and stale-class scrub apply. */
const LOCK_CLASS = "client-workouts-open";
const RECENT_LIMIT = 8;

export function BodyWeightSheet({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const { log, setBodyWeight } = useClientWorkouts(userId);
  const [todayKey] = useState(() => toLocalDateKey(new Date()));
  const [dateKey, setDateKey] = useState(todayKey);
  const [draft, setDraft] = useState(() =>
    log.bodyWeights[todayKey] ? formatBodyWeight(log.bodyWeights[todayKey]) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const backdropDismiss = useOwnPointerDismiss(onClose);
  const entries = bodyWeightEntries(log).slice(0, RECENT_LIMIT);

  useEffect(() => {
    document.body.classList.add(LOCK_CLASS);
    document.documentElement.classList.add(LOCK_CLASS);
    const unlock = lockOverlayDocumentScroll();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      unlock();
      document.body.classList.remove(LOCK_CLASS);
      document.documentElement.classList.remove(LOCK_CLASS);
    };
  }, [onClose]);

  function pickDate(next: string) {
    if (!next || next > todayKey) return;
    setDateKey(next);
    const existing = log.bodyWeights[next];
    setDraft(existing ? formatBodyWeight(existing) : "");
    setError(null);
  }

  function save() {
    const weight = sanitizeBodyWeight(draft);
    if (weight === null) {
      setError("Enter a weight in lb.");
      return;
    }
    setBodyWeight(dateKey, weight);
    onClose();
  }

  return createPortal(
    <div className="client-workouts-root" role="presentation">
      <button
        type="button"
        className="client-workouts-root__backdrop"
        aria-label="Close weight log"
        onPointerDown={backdropDismiss.onPointerDown}
        onPointerUp={backdropDismiss.onPointerUp}
        onClick={backdropDismiss.onClick}
      />
      <div
        className="client-weight-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="client-workouts-dialog__handle" aria-hidden />
        <div className="client-weight-sheet__top">
          <h2 id={titleId} className="client-workouts-dialog__title">
            Log weight
          </h2>
          <FastActivateButton
            className="client-workouts-dialog__close"
            aria-label="Close"
            onActivate={onClose}
          >
            <CloseIcon className="h-4 w-4" />
          </FastActivateButton>
        </div>

        <form
          className="client-weight-sheet__form"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <label className="client-weight-sheet__field">
            <input
              className="client-weight-sheet__input"
              value={draft}
              inputMode="decimal"
              enterKeyHint="done"
              autoComplete="off"
              autoFocus
              placeholder="0.0"
              aria-label="Weight in pounds"
              onChange={(event) => {
                setDraft(event.target.value.replace(/[^\d.]/g, "").slice(0, 6));
                setError(null);
              }}
            />
            <span className="client-weight-sheet__unit">lb</span>
          </label>
          <label className="client-weight-sheet__date">
            <span>{dateKey === todayKey ? "Today" : formatWorkoutDayHeading(dateKey)}</span>
            <input
              type="date"
              value={dateKey}
              max={todayKey}
              aria-label="Weigh-in date"
              onChange={(event) => pickDate(event.target.value)}
            />
          </label>
          {error ? <p className="client-workouts-error">{error}</p> : null}
          <button type="submit" className="client-workouts-btn client-workouts-btn--primary">
            Save weight
          </button>
        </form>

        {entries.length > 0 ? (
          <div className="client-weight-sheet__history">
            <p className="client-weight-sheet__history-title">Recent</p>
            <ul className="client-weight-sheet__list">
              {entries.map((entry, index) => {
                const older = entries[index + 1];
                const diff = older ? Math.round((entry.weight - older.weight) * 10) / 10 : 0;
                return (
                  <li key={entry.dateKey} className="client-weight-sheet__row">
                    <span className="client-weight-sheet__row-date">
                      {entry.dateKey === todayKey
                        ? "Today"
                        : formatWorkoutDayHeading(entry.dateKey)}
                    </span>
                    <span className="client-weight-sheet__row-weight">
                      {formatBodyWeight(entry.weight)} lb
                    </span>
                    <span className="client-weight-sheet__row-diff">
                      {older && diff !== 0
                        ? `${diff > 0 ? "+" : "−"}${formatBodyWeight(Math.abs(diff))}`
                        : ""}
                    </span>
                    <FastActivateButton
                      className="client-weight-sheet__row-remove"
                      aria-label={`Delete weigh-in from ${formatWorkoutDayHeading(entry.dateKey)}`}
                      onActivate={() => setBodyWeight(entry.dateKey, null)}
                    >
                      <CloseIcon className="h-3.5 w-3.5" />
                    </FastActivateButton>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
