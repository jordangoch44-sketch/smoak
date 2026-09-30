"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { useClientWorkouts } from "@/hooks/useClientWorkouts";
import { cn } from "@/lib/utils";
import { buildWeekOverview } from "@/lib/workouts/client-workout-overview";
import { BodyWeightSheet } from "./BodyWeightSheet";

const ARROWS = { up: "▲", down: "▼", same: "=", none: "" } as const;

const noopSubscribe = () => () => {};

/** Recap of the current week: body weight, goal streak, cardio minutes, a highlight, and the split. */
export function ClientWeekOverview({ userId }: { userId: string }) {
  const { log } = useClientWorkouts(userId);
  // Dates differ between server and phone; build only in the browser.
  const inBrowser = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [weightOpen, setWeightOpen] = useState(false);
  const closeWeight = useCallback(() => setWeightOpen(false), []);

  const overview = useMemo(
    () => (inBrowser ? buildWeekOverview(log) : null),
    [log, inBrowser]
  );

  return (
    <div className="client-week-overview">
      <div className="client-week-overview__top">
        <p className="client-week-overview__eyebrow">This week</p>
        <p className="client-week-overview__range">{overview?.rangeLabel ?? ""}</p>
      </div>

      <div className="client-week-overview__stats">
        {(overview?.stats ?? []).map((stat) => {
          const body = (
            <>
              <span className="client-week-overview__value">{stat.value}</span>
              <span className="client-week-overview__label">{stat.label}</span>
              <span
                className={cn(
                  "client-week-overview__delta",
                  `client-week-overview__delta--${stat.delta.direction}`,
                  stat.delta.neutral && "client-week-overview__delta--neutral"
                )}
              >
                {ARROWS[stat.delta.direction]} {stat.delta.text}
              </span>
            </>
          );
          return stat.id === "weight" ? (
            <FastActivateButton
              key={stat.id}
              className="client-week-overview__stat client-week-overview__stat--action"
              aria-label={`Weight ${stat.value} lb. Log weight`}
              onActivate={() => setWeightOpen(true)}
            >
              {body}
            </FastActivateButton>
          ) : (
            <div key={stat.id} className="client-week-overview__stat">
              {body}
            </div>
          );
        })}
      </div>

      <p className="client-week-overview__highlight">
        {overview?.highlight ?? "Log a workout to see your week here."}
      </p>
      {overview?.split ? (
        <p className="client-week-overview__split">{overview.split}</p>
      ) : null}

      {weightOpen ? (
        <BodyWeightSheet userId={userId} onClose={closeWeight} />
      ) : null}
    </div>
  );
}
