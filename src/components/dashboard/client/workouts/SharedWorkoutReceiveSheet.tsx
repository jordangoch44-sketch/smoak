"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  AGE_CONFIRMATION_ERROR,
  LegalAgreementNotice,
} from "@/components/legal/LegalAgreementNotice";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/components/ui/icons";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useClientCoaching } from "@/hooks/useClientCoaching";
import { useClientWorkouts } from "@/hooks/useClientWorkouts";
import { WORKOUTS_PATH } from "@/lib/auth-routes";
import { getAuthCallbackUrl } from "@/lib/auth/site-origin";
import { lockOverlayDocumentScroll } from "@/lib/lock-overlay-scroll";
import { cn } from "@/lib/utils";
import {
  addMonths,
  buildMonthGrid,
  formatMonthTitle,
  formatWorkoutDayAriaLabel,
  formatWorkoutDayHeading,
  parseLocalDateKey,
  startOfMonth,
  toLocalDateKey,
  WEEKDAY_LABELS,
} from "@/lib/workouts/client-workout";
import {
  exercisesFromSharedPlan,
  formatSharedExerciseLine,
  sharedExerciseCountLabel,
  sharedWorkoutDayTaken,
  sharedWorkoutPath,
  sharedWorkoutTitle,
  type SharedWorkoutPreview,
} from "@/lib/workouts/shared-workout";
import "@/styles/client-workouts.css";

const LOCK_CLASS = "client-workouts-open";

/**
 * In the app: quick signup if needed, then a preview the person adds onto an open day.
 */
export function SharedWorkoutReceiveSheet({
  token,
  preview,
  onClose,
}: {
  token: string;
  preview: SharedWorkoutPreview;
  onClose: () => void;
}) {
  const router = useRouter();
  const { isReady, session, signUp, signInWithPassword } = useAuthSession();
  const userId = session?.role === "client" ? session.userId : null;
  const { log, saveDay } = useClientWorkouts(userId);
  const coaching = useClientCoaching(userId);
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ofAge, setOfAge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [todayKey, setTodayKey] = useState(() => toLocalDateKey(new Date()));
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setTodayKey(toLocalDateKey(new Date()));
  }, []);

  useEffect(() => {
    const alreadyLocked = document.body.classList.contains(LOCK_CLASS);
    if (!alreadyLocked) {
      document.body.classList.add(LOCK_CLASS);
      document.documentElement.classList.add(LOCK_CLASS);
    }
    const unlock = alreadyLocked ? null : lockOverlayDocumentScroll();
    return () => {
      unlock?.();
      if (!alreadyLocked) {
        document.body.classList.remove(LOCK_CLASS);
        document.documentElement.classList.remove(LOCK_CLASS);
      }
    };
  }, []);

  const cells = useMemo(() => buildMonthGrid(month, todayKey), [month, todayKey]);
  const title = sharedWorkoutTitle(preview.title);
  const signedInClient = Boolean(userId);
  const wrongAccount = isReady && session != null && session.role !== "client";

  function coachCount(dateKey: string): number {
    return coaching.workoutsByDate.get(dateKey)?.length ?? 0;
  }

  function pickDay(dateKey: string) {
    if (sharedWorkoutDayTaken(log, dateKey, coachCount(dateKey))) {
      setSelected(null);
      setNote("That day already has a workout.");
      return;
    }
    setNote(null);
    setSelected(dateKey);
  }

  function addToDay() {
    if (!userId || !selected || adding) return;
    if (sharedWorkoutDayTaken(log, selected, coachCount(selected))) {
      setSelected(null);
      setNote("That day already has a workout.");
      return;
    }
    setAdding(true);
    const saved = saveDay(selected, exercisesFromSharedPlan(preview.exercises), preview.title);
    if (!saved) {
      setAdding(false);
      setNote("Couldn’t add this workout.");
      return;
    }
    router.replace(`${WORKOUTS_PATH}?day=${selected}`);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === "signup" && !ofAge) {
      setAuthError(AGE_CONFIRMATION_ERROR);
      return;
    }
    setBusy(true);
    setAuthError(null);
    const result =
      mode === "signup"
        ? await signUp("client", email, password, {
            firstName: firstName.trim(),
            emailRedirectTo: getAuthCallbackUrl(sharedWorkoutPath(token)) ?? undefined,
          })
        : await signInWithPassword("client", email, password);
    if (result.ok === "confirm_email") {
      setBusy(false);
      setConfirmEmail(result.email);
      return;
    }
    if (result.ok !== true) {
      setBusy(false);
      setAuthError(result.message);
      return;
    }
    if (result.session.role !== "client") {
      setBusy(false);
      setAuthError("Use a client account to add this workout.");
      return;
    }
    setBusy(false);
  }

  if (typeof document === "undefined") return null;

  const headingId = "shared-workout-title";

  return createPortal(
    <div className="shared-workout-sheet" role="presentation">
      <button type="button" className="shared-workout-sheet__backdrop" aria-label="Close" onClick={onClose} />
      <div
        className="shared-workout-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
      >
        <div className="shared-workout-sheet__top">
          <h2 id={headingId} className="shared-workout-sheet__title">
            {title}
          </h2>
          <FastActivateButton className="shared-workout-sheet__close" aria-label="Close" onActivate={onClose}>
            <CloseIcon className="h-4 w-4" />
          </FastActivateButton>
        </div>
        <p className="shared-workout-sheet__from">
          {preview.senderName} sent you a workout · {sharedExerciseCountLabel(preview.exercises.length)}
        </p>

        {confirmEmail ? (
          <p className="shared-workout-sheet__note">
            Check {confirmEmail}, then open this text again. The workout will be waiting.
          </p>
        ) : wrongAccount ? (
          <p className="shared-workout-sheet__note">Use a client account to add this workout.</p>
        ) : !isReady ? (
          <p className="shared-workout-sheet__note">Loading…</p>
        ) : signedInClient ? (
          <>
            <ul className="shared-workout-sheet__list">
              {preview.exercises.map((exercise, index) => (
                <li key={`${exercise.name}-${index}`}>
                  <span>{exercise.name}</span>
                  <span>{formatSharedExerciseLine(exercise)}</span>
                </li>
              ))}
            </ul>
            <p className="shared-workout-sheet__pick">Pick an open day.</p>
            <div className="client-workouts-month">
              <FastActivateButton
                className="client-workouts-month__nav"
                aria-label="Previous month"
                onActivate={() => setMonth((current) => addMonths(current, -1))}
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </FastActivateButton>
              <h3 className="client-workouts-month__title">{formatMonthTitle(month)}</h3>
              <FastActivateButton
                className="client-workouts-month__nav"
                aria-label="Next month"
                onActivate={() => setMonth((current) => addMonths(current, 1))}
              >
                <ChevronRightIcon className="h-5 w-5" />
              </FastActivateButton>
            </div>
            <div className="client-workouts-weekdays" aria-hidden>
              {WEEKDAY_LABELS.map((label, index) => (
                <span key={`${label}-${index}`}>{label}</span>
              ))}
            </div>
            <div className="client-workouts-cal" role="grid" aria-label="Choose a day">
              {cells.map((cell) => {
                const taken = sharedWorkoutDayTaken(log, cell.dateKey, coachCount(cell.dateKey));
                const picked = selected === cell.dateKey;
                return (
                  <FastActivateButton
                    key={cell.dateKey}
                    className={cn(
                      "client-workouts-cal__day",
                      !cell.inMonth && "client-workouts-cal__day--muted",
                      cell.isToday && "client-workouts-cal__day--today",
                      taken && "client-workouts-cal__day--taken",
                      picked && "client-workouts-cal__day--picked"
                    )}
                    aria-label={
                      taken
                        ? `${formatWorkoutDayAriaLabel(cell.dateKey)}, already has a workout`
                        : `Add workout on ${formatWorkoutDayAriaLabel(cell.dateKey)}`
                    }
                    aria-pressed={picked}
                    onActivate={() => pickDay(cell.dateKey)}
                  >
                    <span className="client-workouts-cal__num">{cell.day}</span>
                  </FastActivateButton>
                );
              })}
            </div>
            {note ? <p className="shared-workout-sheet__note">{note}</p> : null}
            <FastActivateButton
              className="client-workouts-btn client-workouts-btn--primary shared-workout-sheet__add"
              disabled={!selected || adding}
              onActivate={addToDay}
            >
              {adding
                ? "Adding…"
                : selected
                  ? `Add to ${formatWorkoutDayHeading(selected)}`
                  : "Add to a day"}
            </FastActivateButton>
          </>
        ) : (
          <form className="shared-workout-sheet__form" onSubmit={(event) => void submit(event)}>
            <p className="shared-workout-sheet__note">Create an account to add it to your calendar.</p>
            {mode === "signup" ? (
              <label className="shared-workout-sheet__field">
                <span>First name</span>
                <input
                  value={firstName}
                  autoComplete="given-name"
                  onChange={(event) => setFirstName(event.target.value)}
                />
              </label>
            ) : null}
            <label className="shared-workout-sheet__field">
              <span>Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="shared-workout-sheet__field">
              <span>Password</span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {mode === "signup" ? (
              <LegalAgreementNotice ofAge={ofAge} onOfAgeChange={setOfAge} />
            ) : null}
            {authError ? <p className="shared-workout-sheet__note">{authError}</p> : null}
            <button
              type="submit"
              className="client-workouts-btn client-workouts-btn--primary shared-workout-sheet__add"
              disabled={busy || (mode === "signup" && !ofAge)}
            >
              {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </button>
            <button
              type="button"
              className="shared-workout-sheet__switch"
              onClick={() => {
                setMode((current) => (current === "signup" ? "signin" : "signup"));
                setAuthError(null);
              }}
            >
              {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
