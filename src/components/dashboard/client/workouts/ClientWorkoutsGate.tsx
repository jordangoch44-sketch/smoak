import Link from "next/link";
import { ExerciseAvatar } from "@/components/dashboard/client/workouts/ExerciseAvatar";
import {
  CalendarIcon,
  ChartIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DumbbellIcon,
  PlusIcon,
} from "@/components/ui/icons";
import { WORKOUTS_PATH } from "@/lib/auth-routes";
import { buildLoginHref } from "@/lib/auth-return";
import { buildJoinFlowHref } from "@/lib/join-flow";
import "@/styles/client-workouts.css";
import "@/styles/client-workouts-gate.css";

const SIGN_UP_HREF = buildJoinFlowHref({ role: "client" });
const LOG_IN_HREF = buildLoginHref({ role: "client", next: WORKOUTS_PATH });

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;

/** October 2026, Sunday-start. The 3rd is the selected Saturday. */
const CALENDAR_CELLS = [
  { day: 27, muted: true },
  { day: 28, muted: true },
  { day: 29, muted: true },
  { day: 30, muted: true },
  { day: 1, dot: true },
  { day: 2 },
  { day: 3, selected: true },
  { day: 4 },
  { day: 5 },
  { day: 6, dot: true },
  { day: 7 },
  { day: 8, dot: true },
  { day: 9 },
  { day: 10, dot: true },
  { day: 11 },
  { day: 12 },
  { day: 13 },
  { day: 14, dot: true },
  { day: 15 },
  { day: 16 },
  { day: 17, dot: true },
  { day: 18 },
  { day: 19 },
  { day: 20 },
  { day: 21, dot: true },
  { day: 22 },
  { day: 23 },
  { day: 24, dot: true },
  { day: 25 },
  { day: 26 },
  { day: 27 },
  { day: 28, dot: true },
  { day: 29 },
  { day: 30 },
  { day: 31, dot: true },
] as const;

const LOG_EXERCISES = [
  {
    name: "Barbell Bench Press",
    detail: "Chest · Compound",
    sets: [
      { lbs: "135", reps: "10", done: true },
      { lbs: "135", reps: "10", done: true },
      { lbs: "135", reps: "10", done: false },
    ],
  },
  {
    name: "Barbell Bent Over Row",
    detail: "Back · Compound",
    sets: [
      { lbs: "70", reps: "10", done: false },
      { lbs: "80", reps: "8", done: false },
      { lbs: "135", reps: "0", done: false },
    ],
  },
] as const;

const FEATURES = [
  { id: "track", label: "Log your workouts", icon: DumbbellIcon },
  { id: "calendar", label: "Stay consistent with a calendar", icon: CalendarIcon },
  { id: "progress", label: "Track your progress", icon: ChartIcon },
] as const;

function IPhoneChrome() {
  return (
    <>
      <span className="client-workouts-gate__island" />
      <span className="client-workouts-gate__home" />
      <span className="client-workouts-gate__key client-workouts-gate__key--silent" />
      <span className="client-workouts-gate__key client-workouts-gate__key--vol" />
      <span className="client-workouts-gate__key client-workouts-gate__key--power" />
    </>
  );
}

function featureLines(label: string) {
  if (label.startsWith("Log your")) return ["Log your", "workouts"];
  if (label.startsWith("Stay")) return ["Stay consistent", "with a calendar"];
  return ["Track your", "progress"];
}

export function ClientWorkoutsGate() {
  return (
    <section className="client-workouts-gate">
      <div className="client-workouts-gate__copy">
        <h1 className="client-workouts-gate__title">
          Create a
          <span>workout log</span>
        </h1>
        <p className="client-workouts-gate__lede">Plan it. Track it. See your progress.</p>
      </div>

      <div className="client-workouts-gate__stage" aria-hidden>
        <div className="client-workouts-gate__glow" />
        <article className="client-workouts-gate__phone client-workouts-gate__phone--cal">
          <IPhoneChrome />
          <div className="client-workouts-gate__screen">
            <header className="client-workouts-gate__cal-top">
              <p>Workouts</p>
              <span className="client-workouts-gate__plus">
                <PlusIcon />
              </span>
            </header>
            <div className="client-workouts-gate__tabs">
              <span className="is-on">Calendar</span>
              <span>List</span>
            </div>
            <div className="client-workouts-gate__month">
              <ChevronLeftIcon />
              <p>October 2026</p>
              <ChevronRightIcon />
            </div>
            <div className="client-workouts-gate__weekdays">
              {WEEKDAYS.map((letter, index) => (
                <span key={`${letter}-${index}`}>{letter}</span>
              ))}
            </div>
            <div className="client-workouts-gate__grid">
              {CALENDAR_CELLS.map((cell, index) => {
                const muted = "muted" in cell && cell.muted;
                const selected = "selected" in cell && cell.selected;
                const dot = "dot" in cell && cell.dot;
                return (
                  <span
                    key={`${cell.day}-${index}`}
                    className={muted ? "is-muted" : selected ? "is-selected" : undefined}
                  >
                    {cell.day}
                    <i className={dot ? undefined : "is-empty"} />
                  </span>
                );
              })}
            </div>
            <div className="client-workouts-gate__dayline">
              <p>Sat, Oct 3</p>
              <span>2 Workouts</span>
            </div>
            <div className="client-workouts-gate__session">
              <ExerciseAvatar name="barbell bench press" className="client-workouts-gate__thumb" />
              <div>
                <p>Full Body</p>
                <span>45 min · 4 exercises</span>
              </div>
              <span className="client-workouts-gate__done">
                <CheckIcon />
              </span>
            </div>
            <div className="client-workouts-gate__session">
              <span className="client-workouts-gate__run" />
              <div>
                <p>Zone 2 Run</p>
                <span>30 min</span>
              </div>
            </div>
          </div>
        </article>

        <article className="client-workouts-gate__phone client-workouts-gate__phone--log">
          <IPhoneChrome />
          <div className="client-workouts-gate__screen">
            <header className="client-workouts-gate__log-top">
              <ChevronLeftIcon />
              <p>
                Sat, Oct 3
                <i />
              </p>
              <span className="client-workouts-gate__badge">Full body</span>
              <span className="client-workouts-gate__more" />
            </header>
            <p className="client-workouts-gate__meta">1/4 workouts · 0/3 cardio</p>
            <h2 className="client-workouts-gate__workout">Full body</h2>
            {LOG_EXERCISES.map((exercise) => (
              <div key={exercise.name} className="client-workouts-gate__exercise">
                <div className="client-workouts-gate__exercise-head">
                  <ExerciseAvatar name={exercise.name} className="client-workouts-gate__thumb" />
                  <div>
                    <p>{exercise.name}</p>
                    <span>{exercise.detail}</span>
                  </div>
                  <span className="client-workouts-gate__more" />
                </div>
                <div className="client-workouts-gate__sets">
                  <span>Set</span>
                  <span>Lbs</span>
                  <span>Reps</span>
                  <span />
                  {exercise.sets.map((set, index) => (
                    <span key={`${exercise.name}-${index}`} className="client-workouts-gate__set">
                      <span>{index + 1}</span>
                      <span>{set.lbs}</span>
                      <span>{set.reps}</span>
                      <span className={set.done ? "is-on" : undefined} />
                    </span>
                  ))}
                </div>
                <p className="client-workouts-gate__add">+ Add set</p>
              </div>
            ))}
            <p className="client-workouts-gate__add-exercise">+ Add exercise</p>
          </div>
        </article>
      </div>

      <ul className="client-workouts-gate__features">
        {FEATURES.map((feature) => {
          const [first, second] = featureLines(feature.label);
          return (
            <li key={feature.id} className={`client-workouts-gate__feature client-workouts-gate__feature--${feature.id}`}>
              <span className="client-workouts-gate__feature-icon">
                <feature.icon className="client-workouts-gate__feature-glyph" />
              </span>
              <span>
                {first}
                <br />
                {second}
              </span>
            </li>
          );
        })}
      </ul>

      <Link href={SIGN_UP_HREF} className="client-workouts-gate__signup smoac-control">
        Create account
        <span aria-hidden>→</span>
      </Link>
      <p className="client-workouts-gate__login">
        Already have an account? <Link href={LOG_IN_HREF}>Log in</Link>
      </p>
    </section>
  );
}
