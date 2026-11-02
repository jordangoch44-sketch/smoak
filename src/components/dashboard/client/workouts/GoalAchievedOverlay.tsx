"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { MuscleIcon, RunningFigureIcon } from "@/components/ui/icons";
import type { GoalKind } from "@/lib/workouts/client-workout";

const BURST = [
  { y: "-36vh", x: "36vw", spin: "210deg", delay: "0s", top: "34%", color: "#ff6b4a", round: false },
  { y: "-22vh", x: "24vw", spin: "-160deg", delay: "0.02s", top: "48%", color: "#f5c451", round: true },
  { y: "-8vh", x: "40vw", spin: "120deg", delay: "0.05s", top: "58%", color: "#f472b6", round: false },
  { y: "16vh", x: "30vw", spin: "-220deg", delay: "0.01s", top: "62%", color: "#a855f7", round: true },
  { y: "-30vh", x: "18vw", spin: "80deg", delay: "0.07s", top: "42%", color: "#818cf8", round: false },
  { y: "6vh", x: "46vw", spin: "260deg", delay: "0.04s", top: "52%", color: "#7dd3fc", round: true },
  { y: "-14vh", x: "28vw", spin: "-90deg", delay: "0.08s", top: "28%", color: "#fff", round: false },
  { y: "24vh", x: "16vw", spin: "170deg", delay: "0.03s", top: "70%", color: "#ff6b4a", round: true },
] as const;

function ConfettiSide({ side }: { side: "left" | "right" }) {
  const direction = side === "left" ? 1 : -1;
  return (
    <span className={`goal-achieved__confetti goal-achieved__confetti--${side}`} aria-hidden>
      {BURST.map((piece) => (
        <span
          key={`${side}-${piece.top}-${piece.delay}`}
          className="goal-achieved__piece"
          style={{
            top: piece.top,
            background: piece.color,
            borderRadius: piece.round ? "999px" : "0.12rem",
            animationDelay: piece.delay,
            ["--dx" as string]: `calc(${piece.x} * ${direction})`,
            ["--dy" as string]: piece.y,
            ["--spin" as string]: piece.spin,
          }}
        />
      ))}
    </span>
  );
}

function TrophyMark({ kind }: { kind: GoalKind }) {
  const Icon = kind === "cardio" ? RunningFigureIcon : MuscleIcon;
  return (
    <span className="goal-achieved__trophy" aria-hidden>
      <svg className="goal-achieved__trophy-shape" viewBox="0 0 120 128">
        <defs>
          <linearGradient id="goal-trophy-gold" x1="20" y1="16" x2="100" y2="112" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffe7a3" />
            <stop offset="0.48" stopColor="#f5c451" />
            <stop offset="1" stopColor="#d4922a" />
          </linearGradient>
        </defs>
        <path
          d="M34 36c-14 2-18 16-12 26 4 7 12 9 18 6"
          fill="none"
          stroke="url(#goal-trophy-gold)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M86 36c14 2 18 16 12 26-4 7-12 9-18 6"
          fill="none"
          stroke="url(#goal-trophy-gold)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          fill="url(#goal-trophy-gold)"
          d="M36 22h48c1.2 18-.4 34-9.2 43.2C69.4 71 62.4 74 60 74s-9.4-3-14.8-8.8C36.4 56 34.8 40 36 22z"
        />
        <ellipse cx="60" cy="44" rx="15" ry="11" fill="#e7b03a" />
        <path fill="#e0a82e" d="M52 74h16v18c0 2-1.8 3.5-4 3.5h-8c-2.2 0-4-1.5-4-3.5V74z" />
        <rect x="36" y="94" width="48" height="10" rx="3.5" fill="url(#goal-trophy-gold)" />
        <rect x="44" y="104" width="32" height="7" rx="2.5" fill="#c8891e" />
      </svg>
      <span className="goal-achieved__trophy-icon">
        <Icon className="h-6 w-6" />
      </span>
    </span>
  );
}

/** Confetti, then a trophy, after a weekly cardio or workout goal is saved complete. */
export function GoalAchievedOverlay({
  kind,
  onDone,
}: {
  kind: GoalKind;
  onDone: () => void;
}) {
  const label = kind === "cardio" ? "Cardio Goal Achieved" : "Workout Goal Achieved";

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(onDone, reduced ? 2400 : 4600);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <button type="button" className="goal-achieved" aria-label={label} onClick={onDone}>
      <ConfettiSide side="left" />
      <ConfettiSide side="right" />
      <span className="goal-achieved__stage">
        <TrophyMark kind={kind} />
        <span className="goal-achieved__text">{label}</span>
      </span>
    </button>,
    document.body
  );
}
