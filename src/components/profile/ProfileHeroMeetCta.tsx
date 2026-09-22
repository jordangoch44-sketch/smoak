"use client";

import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { LockIcon, PlayIcon, PlusIcon } from "@/components/ui/icons";
import { MEDIA_TAP_SLOP_PX } from "@/hooks/useFastActivate";
import { cn } from "@/lib/utils";
import type { TrainerIntroVideo } from "@/types/trainer";

interface ProfileHeroMeetCtaProps {
  label: string;
  video?: TrainerIntroVideo;
  locked?: boolean;
  /** Owner Live — empty intro slot. Never used on Marketplace. */
  add?: boolean;
  onPlay: () => void;
}

/** Play chip above the public bio — Pro / PRO+ intro clip. */
export function ProfileHeroMeetCta({
  label,
  video,
  locked = false,
  add = false,
  onPlay,
}: ProfileHeroMeetCtaProps) {
  const poster = add ? "" : video?.poster?.trim() ?? "";
  return (
    <FastActivateButton
      className={cn(
        "smoac-control profile-hero__meet",
        locked && "profile-hero__meet--locked"
      )}
      aria-label={
        add
          ? "Add intro video"
          : locked
            ? `${label}, locked on Free. Upgrade to show on Marketplace.`
            : `Play intro video, ${label}`
      }
      slopPx={MEDIA_TAP_SLOP_PX}
      onActivate={onPlay}
    >
      <span className="profile-hero__meet-play" aria-hidden>
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" className="profile-hero__meet-poster" />
        ) : null}
        {add ? (
          <PlusIcon className="profile-hero__meet-plus" />
        ) : locked ? (
          <LockIcon className="profile-hero__meet-lock" />
        ) : (
          <PlayIcon className="profile-hero__meet-icon" />
        )}
      </span>
      <span className="profile-hero__meet-label">{label}</span>
    </FastActivateButton>
  );
}
