"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon } from "@/components/ui/icons";
import { nextWorkoutFinishPhrase } from "@/lib/workouts/workout-finish-phrase";

/** Brief celebration after a finished workout has slid away. */
export function WorkoutNiceOverlay({ onDone }: { onDone: () => void }) {
  const [phrase] = useState(nextWorkoutFinishPhrase);

  useEffect(() => {
    const timer = window.setTimeout(onDone, 1600);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <button type="button" className="workout-nice" aria-label={phrase} onClick={onDone}>
      <span className="workout-nice__mark" aria-hidden>
        <CheckIcon className="h-10 w-10" />
      </span>
      <span className="workout-nice__text">{phrase}</span>
    </button>,
    document.body
  );
}
