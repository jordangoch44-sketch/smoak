"use client";

import { useEffect, useState } from "react";
import { ExerciseMark } from "@/components/dashboard/client/workouts/ExerciseMark";
import { LOGO_SRC } from "@/lib/brand";
import { findLibraryExercise } from "@/lib/workouts/exercise-catalog";
import {
  cachedExerciseGuide,
  cachedLibraryStill,
  loadExerciseGif,
  loadLibraryExerciseMedia,
} from "@/lib/workouts/exercise-media-client";
import { cn } from "@/lib/utils";

/** Library exercises use the ExerciseDB photo. Created ones use their photo, or the SMOAC mark. */
export function ExerciseAvatar({
  name,
  imageUrl,
  logoWhenEmpty = false,
  animated = false,
  className,
}: {
  name: string;
  imageUrl?: string;
  /** Created exercises with no photo use the SMOAC mark. */
  logoWhenEmpty?: boolean;
  /** Play the exercise GIF. Used on the detail sheet, not in the list. */
  animated?: boolean;
  className?: string;
}) {
  const ownPhoto = imageUrl?.trim() || "";
  const fromLibrary = !ownPhoto && Boolean(name.trim() && findLibraryExercise(name));
  const [still, setStill] = useState(() => (fromLibrary ? cachedLibraryStill(name) : ""));
  const [gif, setGif] = useState(() =>
    animated && fromLibrary ? cachedExerciseGuide(name)?.gifUrl ?? "" : ""
  );

  useEffect(() => {
    if (!fromLibrary) return;
    let cancelled = false;
    const key = name.trim().toLowerCase();
    void loadLibraryExerciseMedia().then((media) => {
      const url = media[key]?.imageUrl ?? "";
      if (!cancelled && url) setStill(url);
    });
    if (!animated) {
      return () => {
        cancelled = true;
      };
    }
    void loadExerciseGif(name).then((url) => {
      if (!cancelled && url) setGif(url);
    });
    return () => {
      cancelled = true;
    };
  }, [animated, fromLibrary, name]);

  const photo = ownPhoto || gif || still;
  if (photo) {
    return <img src={photo} alt="" className={cn("exercise-mark exercise-avatar", className)} />;
  }
  if (fromLibrary) {
    return (
      <span
        className={cn("exercise-mark exercise-avatar exercise-avatar--wait", className)}
        aria-hidden
      />
    );
  }
  if (logoWhenEmpty || name.trim()) {
    return (
      <img src={LOGO_SRC} alt="" className={cn("exercise-mark exercise-avatar", className)} />
    );
  }
  return <ExerciseMark name={name} className={className} />;
}
