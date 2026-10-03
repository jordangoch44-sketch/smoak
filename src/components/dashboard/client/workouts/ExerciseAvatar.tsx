"use client";

import { useEffect, useState } from "react";
import { ExerciseMark } from "@/components/dashboard/client/workouts/ExerciseMark";
import { LOGO_SRC } from "@/lib/brand";
import { findLibraryExercise } from "@/lib/workouts/exercise-catalog";
import {
  loadExerciseGif,
  loadLibraryExerciseMedia,
} from "@/lib/workouts/exercise-media-client";
import { cn } from "@/lib/utils";

/** Library exercises use an ExerciseDB still, or the drawn figure. Created ones use a photo, or the SMOAC mark. */
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
  const [remote, setRemote] = useState("");

  useEffect(() => {
    if (!fromLibrary) return;
    let cancelled = false;
    const key = name.trim().toLowerCase();
    const load = animated
      ? loadExerciseGif(name).then(async (gif) => {
          if (gif) return gif;
          const media = await loadLibraryExerciseMedia();
          return media[key]?.imageUrl ?? "";
        })
      : loadLibraryExerciseMedia().then((media) => media[key]?.imageUrl ?? "");
    void load.then((url) => {
      if (!cancelled && url) setRemote(url);
    });
    return () => {
      cancelled = true;
    };
  }, [animated, fromLibrary, name]);

  const photo = ownPhoto || remote;
  if (photo) {
    return <img src={photo} alt="" className={cn("exercise-mark exercise-avatar", className)} />;
  }
  if (logoWhenEmpty || (name.trim() && !findLibraryExercise(name))) {
    return (
      <img src={LOGO_SRC} alt="" className={cn("exercise-mark exercise-avatar", className)} />
    );
  }
  return <ExerciseMark name={name} className={className} />;
}
