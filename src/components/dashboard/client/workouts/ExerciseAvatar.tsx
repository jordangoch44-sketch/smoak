"use client";

import { useEffect, useState } from "react";
import { ExerciseMark } from "@/components/dashboard/client/workouts/ExerciseMark";
import { LOGO_ICON_SRC } from "@/lib/brand";
import { findLibraryExercise } from "@/lib/workouts/exercise-catalog";
import {
  bundledExerciseMedia,
  cachedLibraryStill,
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
  const bundled = fromLibrary ? bundledExerciseMedia(name) : null;
  const gifUrl = animated ? bundled?.gifUrl || "" : "";
  const [fetchedStill, setFetchedStill] = useState("");
  const [readyGif, setReadyGif] = useState("");

  useEffect(() => {
    if (!fromLibrary || bundled?.imageUrl) return;
    let cancelled = false;
    const key = name.trim().toLowerCase();
    void loadLibraryExerciseMedia().then((media) => {
      const url = media[key]?.imageUrl ?? "";
      if (!cancelled && url) setFetchedStill(url);
    });
    return () => {
      cancelled = true;
    };
  }, [bundled?.imageUrl, fromLibrary, name]);

  useEffect(() => {
    if (!gifUrl) return;
    let cancelled = false;
    const clip = new Image();
    clip.onload = () => {
      if (!cancelled) setReadyGif(gifUrl);
    };
    clip.src = gifUrl;
    return () => {
      cancelled = true;
    };
  }, [gifUrl]);

  const still =
    ownPhoto || bundled?.imageUrl || fetchedStill || (fromLibrary ? cachedLibraryStill(name) : "");
  const photo = (readyGif === gifUrl ? gifUrl : "") || still;
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        decoding="async"
        className={cn("exercise-mark exercise-avatar", className)}
      />
    );
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
      <img
        src={LOGO_ICON_SRC}
        alt=""
        className={cn("exercise-mark exercise-avatar exercise-avatar--logo", className)}
      />
    );
  }
  return <ExerciseMark name={name} className={className} />;
}
