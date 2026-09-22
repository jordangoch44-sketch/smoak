import {
  parseVideoPosterMap,
  pruneVideoPosterMap,
  resolveVideoPoster,
  serializeVideoPosterMap,
  type VideoPosterMap,
} from "@/lib/media/video-poster";
import {
  firstNameFromPersonName,
  isBusinessDerivedFirstName,
} from "@/lib/specialist-display-name";
import { isTrainerProPlus } from "@/lib/specialist-premium";
import type { TrainerIntroVideo } from "@/types/trainer";

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/** Intro video is a Pro perk — paid Pro, PRO+, and an active Pro trial. */
export function isTrainerIntroVideoUnlocked(trainer: {
  isPremium?: boolean;
  membershipPlan?: string | null;
}): boolean {
  return trainer.isPremium === true || isTrainerProPlus(trainer);
}

export function asTrainerIntroVideo(value: unknown): TrainerIntroVideo | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  const src = typeof row.src === "string" ? row.src.trim() : "";
  if (!src) return undefined;
  const poster =
    typeof row.poster === "string" && row.poster.trim()
      ? row.poster.trim()
      : undefined;
  const duration =
    typeof row.duration === "number" && Number.isFinite(row.duration)
      ? Math.max(0, row.duration)
      : undefined;
  return {
    src,
    ...(poster ? { poster } : {}),
    ...(duration != null ? { duration } : {}),
  };
}

export function parseIntroVideoFromFields(
  url: string | undefined,
  posterJson: string | undefined
): TrainerIntroVideo | undefined {
  const src = url?.trim() ?? "";
  if (!src || !isHttpUrl(src)) return undefined;
  const poster = resolveVideoPoster(parseVideoPosterMap(posterJson ?? ""), src);
  return {
    src,
    ...(poster?.posterUrl ? { poster: poster.posterUrl } : {}),
    ...(poster ? { duration: poster.duration } : {}),
  };
}

export function introVideoToFormFields(
  video: TrainerIntroVideo | undefined
): { introVideoUrl: string; introVideoPosterJson: string } {
  const src = video?.src?.trim() ?? "";
  if (!src) {
    return { introVideoUrl: "", introVideoPosterJson: "" };
  }
  const map: VideoPosterMap = {};
  if (video?.poster?.trim()) {
    map[src] = {
      posterUrl: video.poster.trim(),
      duration: typeof video.duration === "number" ? video.duration : 0,
      time: 0,
    };
  }
  return {
    introVideoUrl: src,
    introVideoPosterJson: serializeVideoPosterMap(
      pruneVideoPosterMap(map, [src])
    ),
  };
}

export function meetNameForTrainer(trainer: {
  name?: string;
  specialistFirstName?: string;
}): string {
  const business = trainer.name?.trim() ?? "";
  const personal = firstNameFromPersonName(trainer.specialistFirstName ?? "");
  if (personal && !isBusinessDerivedFirstName(personal, business)) {
    return personal;
  }
  return firstNameFromPersonName(business);
}

export function meetCtaLabel(trainer: {
  name?: string;
  specialistFirstName?: string;
}): string {
  const name = meetNameForTrainer(trainer);
  return name ? `Hi, I'm ${name}` : "Watch intro";
}

/** Owner Live only — empty intro chip for Pro / trial / PRO+. */
export const ADD_INTRO_VIDEO_CTA_LABEL = "Add a video";
