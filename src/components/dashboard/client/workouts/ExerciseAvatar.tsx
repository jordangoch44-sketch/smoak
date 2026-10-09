"use client";

import { useEffect, useState } from "react";
import { ExerciseMark } from "@/components/dashboard/client/workouts/ExerciseMark";
import { LOGO_ICON_SRC } from "@/lib/brand";
import { catalogExerciseImage } from "@/data/exercise-db-catalog";
import { isKnownExercise } from "@/lib/workouts/exercise-catalog";
import {
  bundledExerciseMedia,
  cachedLibraryStill,
  libraryThumbUrl,
  loadLibraryExerciseMedia,
} from "@/lib/workouts/exercise-media-client";
import { cn } from "@/lib/utils";

/** Library exercises use the ExerciseDB photo. Created ones use their photo, or the SMOAC mark. */
export function ExerciseAvatar({
  name,
  imageUrl,
  gifUrl: gifUrlProp,
  logoWhenEmpty = false,
  animated = false,
  priority = false,
  className,
}: {
  name: string;
  imageUrl?: string;
  /** Clip to play once it has loaded. The still stays up until then. */
  gifUrl?: string;
  /** Created exercises with no photo use the SMOAC mark. */
  logoWhenEmpty?: boolean;
  /** Play the exercise GIF. Used on the detail sheet, not in the list. */
  animated?: boolean;
  /** Load this still ahead of the rest of a long search list. */
  priority?: boolean;
  className?: string;
}) {
  const ownPhoto = imageUrl?.trim() || "";
  const fromLibrary = !ownPhoto && Boolean(name.trim() && isKnownExercise(name));
  const catalogStill = fromLibrary ? catalogExerciseImage(name) : "";
  const bundled = fromLibrary ? bundledExerciseMedia(name) : null;
  const thumbUrl = fromLibrary ? libraryThumbUrl(name) : "";
  const gifUrl = animated ? gifUrlProp || bundled?.gifUrl || "" : "";
  const [thumbFailed, setThumbFailed] = useState(false);
  const [fetchedStill, setFetchedStill] = useState("");
  const [readyGif, setReadyGif] = useState("");

  useEffect(() => {
    setThumbFailed(false);
  }, [thumbUrl]);

  useEffect(() => {
    if (!fromLibrary || bundled?.imageUrl || thumbUrl) return;
    let cancelled = false;
    const key = name.trim().toLowerCase();
    void loadLibraryExerciseMedia().then((media) => {
      const url = media[key]?.imageUrl ?? "";
      if (!cancelled && url) setFetchedStill(url);
    });
    return () => {
      cancelled = true;
    };
  }, [bundled?.imageUrl, fromLibrary, name, thumbUrl]);

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
    ownPhoto ||
    (thumbFailed ? "" : thumbUrl) ||
    bundled?.imageUrl ||
    catalogStill ||
    fetchedStill ||
    (fromLibrary ? cachedLibraryStill(name) : "");
  const photo = (readyGif === gifUrl ? gifUrl : "") || still;
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        decoding={photo === gifUrl ? "async" : "auto"}
        fetchPriority={priority && photo !== gifUrl ? "high" : "auto"}
        className={cn("exercise-mark exercise-avatar", className)}
        onError={() => {
          if (thumbUrl && photo === thumbUrl) setThumbFailed(true);
        }}
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
