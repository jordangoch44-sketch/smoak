"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import {
  ChartIcon,
  ChevronRightIcon,
  CloseIcon,
  DumbbellIcon,
  HeartIcon,
  PlusIcon,
} from "@/components/ui/icons";
import { useOwnPointerDismiss } from "@/hooks/useFastActivate";
import { useClientWorkouts } from "@/hooks/useClientWorkouts";
import { lockOverlayDocumentScroll } from "@/lib/lock-overlay-scroll";
import { SITE_ROUTES } from "@/lib/navigation";
import {
  addDays,
  currentWeekStreak,
  formatBodyWeight,
  startOfWeekSunday,
} from "@/lib/workouts/client-workout";
import {
  buildWeekOverview,
  weekRecapFigures,
  type WeekRecapFigures,
} from "@/lib/workouts/client-workout-overview";
import { BodyWeightSheet } from "./BodyWeightSheet";
import "@/styles/client-workouts.css";

const noopSubscribe = () => () => {};
const LOCK_CLASS = "client-workouts-open";

function weekCompare(
  current: number,
  previous: number
): { title: string; detail: string } {
  if (current <= 0 && previous <= 0) {
    return { title: "Nothing logged yet", detail: "Your week starts here" };
  }
  if (current === previous) {
    return { title: "Same as last week", detail: "Keep it up!" };
  }
  const diff = Math.abs(current - previous);
  const noun = diff === 1 ? "workout" : "workouts";
  if (current > previous) {
    return { title: "Up from last week", detail: `${diff} more ${noun}` };
  }
  return { title: "Down from last week", detail: `${diff} fewer ${noun}` };
}

/** Recap of the current week: workouts, streak, cardio, and body weight. */
export function ClientWeekOverview({ userId }: { userId: string }) {
  const router = useRouter();
  const { log } = useClientWorkouts(userId);
  const inBrowser = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [weightOpen, setWeightOpen] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const closeWeight = useCallback(() => setWeightOpen(false), []);
  const closeRecap = useCallback(() => setRecapOpen(false), []);

  const overview = useMemo(() => {
    if (!inBrowser) return null;
    const today = new Date();
    const weekStart = startOfWeekSunday(today);
    const built = buildWeekOverview(log, today);
    const current = weekRecapFigures(log, weekStart);
    const previous = weekRecapFigures(log, addDays(weekStart, -7));
    return {
      rangeLabel: built.rangeLabel,
      highlight: built.highlight,
      split: built.split,
      current,
      streak: currentWeekStreak(log, today),
      compare: weekCompare(current.workouts, previous.workouts),
    };
  }, [log, inBrowser]);

  const weightLabel =
    overview?.current.weightLb == null
      ? "Not logged"
      : `${formatBodyWeight(overview.current.weightLb)} pounds`;

  return (
    <section className="client-week-card" aria-label="This week">
      <div className="client-week-card__top">
        <p className="client-week-card__eyebrow">This week</p>
        <FastActivateButton
          className="client-week-card__range"
          aria-label="Open workouts"
          onActivate={() => router.push(SITE_ROUTES.workouts)}
        >
          <span>{overview?.rangeLabel ?? ""}</span>
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </FastActivateButton>
      </div>

      <div className="client-week-card__stats">
        <StatTile
          tone="workouts"
          icon={<DumbbellIcon className="h-4 w-4" />}
          value={overview ? String(overview.current.workouts) : "—"}
          label="Workouts"
        />
        <StatTile
          tone="streak"
          icon={<FlameMark />}
          value={overview ? String(overview.streak) : "—"}
          label="Wk Streak"
        />
        <StatTile
          tone="cardio"
          icon={<HeartIcon className="h-4 w-4" />}
          value={overview ? String(overview.current.cardioMinutes) : "—"}
          label="Cardio Min"
        />
        <FastActivateButton
          className="client-week-card__stat client-week-card__stat--action"
          aria-label={`Weight ${weightLabel}. Log weight`}
          onActivate={() => setWeightOpen(true)}
        >
          <span className="client-week-card__stat-icon client-week-card__stat-icon--weight" aria-hidden>
            <ScaleMark />
          </span>
          {overview?.current.weightLb == null ? (
            <PlusIcon className="client-week-card__plus h-4 w-4" />
          ) : (
            <span className="client-week-card__value">
              {formatBodyWeight(overview.current.weightLb)}
            </span>
          )}
          <span className="client-week-card__label">Lb Weight</span>
        </FastActivateButton>
      </div>

      <div className="client-week-card__foot">
        <div className="client-week-card__compare">
          <ChartIcon className="client-week-card__compare-icon h-4 w-4" />
          <span>
            <span className="client-week-card__compare-title">
              {overview?.compare.title ?? "This week"}
            </span>
            <span className="client-week-card__compare-detail">
              {overview?.compare.detail ?? ""}
            </span>
          </span>
        </div>
        <FastActivateButton
          className="client-week-card__recap"
          onActivate={() => setRecapOpen(true)}
        >
          View Weekly Recap
          <ChevronRightIcon className="h-4 w-4" />
        </FastActivateButton>
      </div>

      {weightOpen ? <BodyWeightSheet userId={userId} onClose={closeWeight} /> : null}
      {recapOpen && overview ? (
        <WeekRecapSheet
          rangeLabel={overview.rangeLabel}
          highlight={overview.highlight}
          split={overview.split}
          figures={overview.current}
          streak={overview.streak}
          onClose={closeRecap}
          onOpenWorkouts={() => {
            closeRecap();
            router.push(SITE_ROUTES.workouts);
          }}
        />
      ) : null}
    </section>
  );
}

function StatTile({
  tone,
  icon,
  value,
  label,
}: {
  tone: "workouts" | "streak" | "cardio";
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="client-week-card__stat">
      <span className={`client-week-card__stat-icon client-week-card__stat-icon--${tone}`} aria-hidden>
        {icon}
      </span>
      <span className="client-week-card__value">{value}</span>
      <span className="client-week-card__label">{label}</span>
    </div>
  );
}

function WeekRecapSheet({
  rangeLabel,
  highlight,
  split,
  figures,
  streak,
  onClose,
  onOpenWorkouts,
}: {
  rangeLabel: string;
  highlight: string | null;
  split: string | null;
  figures: WeekRecapFigures;
  streak: number;
  onClose: () => void;
  onOpenWorkouts: () => void;
}) {
  const titleId = useId();
  const backdropDismiss = useOwnPointerDismiss(onClose);

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

  return createPortal(
    <div className="client-workouts-root" role="presentation">
      <button
        type="button"
        className="client-workouts-root__backdrop"
        aria-label="Close weekly recap"
        onPointerDown={backdropDismiss.onPointerDown}
        onPointerUp={backdropDismiss.onPointerUp}
        onClick={backdropDismiss.onClick}
      />
      <div
        className="client-weight-sheet client-recap-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="client-workouts-dialog__handle" aria-hidden />
        <div className="client-weight-sheet__top">
          <h2 id={titleId} className="client-workouts-dialog__title">
            Week of {rangeLabel}
          </h2>
          <FastActivateButton
            className="client-workouts-dialog__close"
            aria-label="Close"
            onActivate={onClose}
          >
            <CloseIcon className="h-4 w-4" />
          </FastActivateButton>
        </div>
      <p className="client-recap-sheet__lead">
        {highlight ??
          (figures.workouts > 0 || figures.cardioMinutes > 0
            ? "This week so far."
            : "Log a workout to fill in this week.")}
      </p>
      {split ? <p className="client-recap-sheet__split">{split}</p> : null}
      <ul className="client-recap-sheet__lines">
        <li>
          <span>Workouts</span>
          <span>{figures.workouts}</span>
        </li>
        <li>
          <span>Week streak</span>
          <span>{streak}</span>
        </li>
        <li>
          <span>Cardio</span>
          <span>{figures.cardioMinutes} min</span>
        </li>
        <li>
          <span>Weight</span>
          <span>
            {figures.weightLb == null ? "—" : `${formatBodyWeight(figures.weightLb)} lb`}
          </span>
        </li>
        {figures.topSet ? (
          <li>
            <span>{figures.topSet.prGainLb > 0 ? "Top set PR" : "Top set"}</span>
            <span>
              {figures.topSet.name} {formatBodyWeight(figures.topSet.weightLb)} lb
            </span>
          </li>
        ) : null}
      </ul>
      <FastActivateButton className="client-week-card__recap client-recap-sheet__open" onActivate={onOpenWorkouts}>
        Open workouts
        <ChevronRightIcon className="h-4 w-4" />
      </FastActivateButton>
      </div>
    </div>,
    document.body
  );
}

function FlameMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3.5c.4 2.4-1.1 3.8-1.1 5.6 0 1 .6 1.7 1.4 1.7.2-1.6 1.5-2.6 2.2-4 .8 1.1 2.5 2.8 2.5 5.7 0 3.6-2.7 6.5-6.5 6.5S4.5 16.1 4.5 12.4c0-2.4 1.3-4.2 2.6-5.6.3 1.5 1.2 2.4 1.9 2.4.1-2.2 1.6-3.7 3-5.7z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ScaleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="8.5" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 8.5V7a3 3 0 016 0v1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="13" r="1.15" fill="currentColor" />
    </svg>
  );
}
