"use client";

import { useState } from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { LockIcon, PlayIcon, PlusIcon } from "@/components/ui/icons";
import { MEDIA_TAP_SLOP_PX } from "@/hooks/useFastActivate";
import {
  ADD_INTRO_VIDEO_CTA_LABEL,
  isTrainerIntroVideoUnlocked,
  meetCtaLabel,
} from "@/lib/specialist-intro-video";
import { cn } from "@/lib/utils";
import type { Trainer, TrainerIntroVideo } from "@/types";
import { ProfileGalleryModal } from "./ProfileGalleryModal";
import { ProfileHeroBio } from "./ProfileHeroBio";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";

interface ProfileOverviewAboutProps {
  trainer: Trainer;
  variant?: "public" | "specialist-live";
  /** Owner Live — Free intro-video teaser. Never used on Marketplace. */
  lockedPreviewIntro?: TrainerIntroVideo;
  /** Owner Live — empty intro slot. Never Marketplace. */
  onAddIntroVideo?: () => void;
  onUpgrade?: () => void;
}

/** About text beside the intro video, at the top of Overview. */
export function ProfileOverviewAbout({
  trainer,
  variant = "public",
  lockedPreviewIntro,
  onAddIntroVideo,
  onUpgrade,
}: ProfileOverviewAboutProps) {
  const isSpecialistLive = variant === "specialist-live";
  const bio = typeof trainer.bio === "string" ? trainer.bio.trim() : "";
  const introUnlocked = isTrainerIntroVideoUnlocked(trainer);
  const liveIntro = introUnlocked ? trainer.introVideo : undefined;
  const lockedIntro =
    isSpecialistLive && !introUnlocked ? lockedPreviewIntro : undefined;
  const introVideo = liveIntro?.src?.trim()
    ? liveIntro
    : lockedIntro?.src?.trim()
      ? lockedIntro
      : undefined;
  const introLocked = Boolean(introVideo && lockedIntro && !liveIntro);
  const canAddIntro =
    isSpecialistLive &&
    introUnlocked &&
    !introVideo &&
    Boolean(onAddIntroVideo);
  const showMedia = Boolean(introVideo || canAddIntro);
  const meetLabel = canAddIntro
    ? ADD_INTRO_VIDEO_CTA_LABEL
    : meetCtaLabel(trainer);
  const poster = introVideo?.poster?.trim() ?? "";
  const [introOpen, setIntroOpen] = useState(false);

  if (!bio && !showMedia) return null;

  return (
    <>
      <ProfileSection
        variant="panel"
        aria-label="About me"
        className={cn("profile-about", showMedia && "profile-about--split")}
      >
        {showMedia ? (
          <FastActivateButton
            className={cn(
              "smoac-control profile-about__media",
              introLocked && "profile-about__media--locked"
            )}
            aria-label={
              canAddIntro
                ? "Add intro video"
                : introLocked
                  ? `${meetLabel}, locked on Free. Upgrade to show on Marketplace.`
                  : `Play intro video, ${meetLabel}`
            }
            slopPx={MEDIA_TAP_SLOP_PX}
            onActivate={() => {
              if (canAddIntro) {
                onAddIntroVideo?.();
                return;
              }
              if (introLocked) {
                onUpgrade?.();
                return;
              }
              setIntroOpen(true);
            }}
          >
            {poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={poster} alt="" className="profile-about__poster" />
            ) : null}
            <span className="profile-about__play" aria-hidden>
              {canAddIntro ? (
                <PlusIcon className="profile-about__play-icon" />
              ) : introLocked ? (
                <LockIcon className="profile-about__play-icon" />
              ) : (
                <PlayIcon className="profile-about__play-icon profile-about__play-icon--play" />
              )}
            </span>
          </FastActivateButton>
        ) : null}
        <div className="profile-about__copy">
          <ProfileSectionHeader title="About Me" />
          {bio ? <ProfileHeroBio bio={bio} lines={4} /> : null}
        </div>
      </ProfileSection>

      <ProfileGalleryModal
        open={introOpen}
        media={
          introVideo
            ? [
                {
                  id: "intro-video",
                  type: "video",
                  url: introVideo.src,
                  thumbnail: introVideo.poster,
                  duration: introVideo.duration,
                  alt: meetLabel,
                },
              ]
            : []
        }
        trainerName={trainer.name}
        onClose={() => setIntroOpen(false)}
      />
    </>
  );
}
