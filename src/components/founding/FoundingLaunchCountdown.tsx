"use client";

import { useEffect, useState } from "react";
import {
  FOUNDING_LAUNCH_LABEL,
  getFoundingCountdownParts,
  padCountdownUnit,
  type FoundingCountdownParts,
} from "@/lib/founding-50-invite";

const UNITS: ReadonlyArray<{
  key: keyof Omit<FoundingCountdownParts, "done">;
  label: string;
  digits: number;
}> = [
  { key: "days", label: "Days", digits: 3 },
  { key: "hours", label: "Hours", digits: 2 },
  { key: "minutes", label: "Minutes", digits: 2 },
  { key: "seconds", label: "Seconds", digits: 2 },
];

export function FoundingLaunchCountdown() {
  const [parts, setParts] = useState<FoundingCountdownParts | null>(null);

  useEffect(() => {
    const tick = () => setParts(getFoundingCountdownParts());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const shown = parts ?? {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    done: false,
  };

  return (
    <div
      className={
        parts
          ? "founding-invite-page__timer"
          : "founding-invite-page__timer founding-invite-page__timer--pending"
      }
      aria-label={
        shown.done
          ? `SMOAC is live as of ${FOUNDING_LAUNCH_LABEL}`
          : `Countdown to SMOAC launch on ${FOUNDING_LAUNCH_LABEL}`
      }
    >
      <p className="founding-invite-page__timer-caption">
        {shown.done ? "Live" : `Launch · ${FOUNDING_LAUNCH_LABEL}`}
      </p>
      <div className="founding-invite-page__timer-grid" aria-hidden="true">
        {UNITS.map((unit) => (
          <div key={unit.key} className="founding-invite-page__timer-unit">
            <span className="founding-invite-page__timer-value">
              {padCountdownUnit(shown[unit.key], unit.digits)}
            </span>
            <span className="founding-invite-page__timer-label">{unit.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
