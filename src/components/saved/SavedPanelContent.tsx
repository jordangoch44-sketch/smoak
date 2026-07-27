"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  useActiveUserCoordinates,
  useActiveUserCoordinatesKey,
} from "@/hooks/useActiveUserCoordinates";
import { useHydrated } from "@/hooks/useHydrated";
import { usePersonalizationCity } from "@/hooks/usePersonalizationCity";
import { sortTrainersByPersonalizationCity } from "@/lib/personalized-trainers";
import { useSavedTrainers } from "@/hooks/useSavedTrainers";
import { useAuthSession } from "@/hooks/useAuthSession";
import { TrainerList } from "@/components/trainers";
import { Button } from "@/components/ui/Button";
import { SavedAuthGlassCard } from "@/components/saved/SavedAuthGlassCard";
import { SavedPanelAuthCta } from "@/components/saved/SavedPanelAuthCta";
import { cn } from "@/lib/utils";
import {
  buildJoinFlowHrefForSaved,
  buildLoginHrefForSaved,
} from "@/lib/auth-return";
import { formatSavedSpecialistsTitle } from "@/lib/saved-ui";
import { markSavedTrainersLoadTimedOut } from "@/lib/saved-trainers-store";

interface SavedPanelContentProps {
  /** Overlay dropdown vs full /saved route */
  variant?: "overlay" | "page";
  titleId?: string;
  /** Close header overlay before navigating to auth (mobile panel) */
  onAuthNavigate?: () => void;
}

/** Shared saved specialists list — overlay panel and /saved route */
export function SavedPanelContent({
  variant = "overlay",
  titleId = "saved-panel-title",
  onAuthNavigate,
}: SavedPanelContentProps) {
  const {
    isReady,
    isSavesReady,
    isSavesLoading,
    savesError,
    isClientWithSaves,
    getSavedTrainers,
  } = useSavedTrainers();
  const { session } = useAuthSession();
  const hydrated = useHydrated();
  const personalizationCity = usePersonalizationCity();
  const userCoords = useActiveUserCoordinates();
  const coordsKey = useActiveUserCoordinatesKey();
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const saved = useMemo(
    () =>
      sortTrainersByPersonalizationCity(
        getSavedTrainers(),
        hydrated ? personalizationCity : null,
        hydrated ? userCoords : null
      ),
    [getSavedTrainers, personalizationCity, hydrated, coordsKey, userCoords]
  );
  const isOverlay = variant === "overlay";
  const isLoggedOut = isReady && !session;
  const treatsSavesReady = isSavesReady || loadTimedOut;
  const isEmptyClient =
    isReady && treatsSavesReady && isClientWithSaves && saved.length === 0;
  const isSpecialistSignedIn =
    isReady &&
    treatsSavesReady &&
    session?.role === "specialist" &&
    saved.length === 0;
  const isClientLoadingSaves =
    isReady && isClientWithSaves && !treatsSavesReady && !isLoggedOut;

  useEffect(() => {
    if (!isSavesLoading) {
      setLoadTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => {
      markSavedTrainersLoadTimedOut();
      setLoadTimedOut(true);
    }, 12_000);
    return () => window.clearTimeout(timer);
  }, [isSavesLoading]);

  const loginHref = buildLoginHrefForSaved();
  const joinHref = buildJoinFlowHrefForSaved();

  function handleAuthNavigate() {
    onAuthNavigate?.();
  }

  function subtitleText(): string {
    if (!isReady) return "Loading saved specialists…";
    if (isClientLoadingSaves) return "Loading saved specialists…";
    if (savesError || loadTimedOut) {
      return "Could not sync your shortlist — showing cached saves. Try again shortly.";
    }
    if (isLoggedOut) return "Sign in to access your shortlist.";
    if (saved.length > 0) {
      return `${saved.length} specialist${saved.length !== 1 ? "s" : ""} in your shortlist`;
    }
    if (isClientWithSaves) return "Your saved library is empty.";
    return "Sign in as a client to save specialists.";
  }

  const showPageAuthStage = !isOverlay && isReady && isLoggedOut;

  return (
    <div
      className={
        isOverlay
          ? "saved-dropdown__content"
          : cn(
              "saved-page mx-auto w-full max-w-7xl",
              showPageAuthStage ? undefined : "saved-page--padded"
            )
      }
    >
      {showPageAuthStage ? null : (
        <div className={isOverlay ? undefined : "max-w-2xl"}>
          <h2
            className={
              isOverlay
                ? "saved-dropdown__title"
                : "text-2xl font-medium tracking-tight text-white sm:text-3xl md:text-4xl"
            }
            id={titleId}
          >
            {formatSavedSpecialistsTitle(saved.length)}
          </h2>
          <p
            className={
              isOverlay
                ? "saved-dropdown__subtitle"
                : "mt-2 text-sm text-silver-400 sm:text-base"
            }
          >
            {subtitleText()}
          </p>
        </div>
      )}

      {isReady && isLoggedOut ? (
        isOverlay ? (
          <div className="saved-dropdown__empty saved-dropdown__auth-block">
            <SavedAuthGlassCard
              compact
              loginHref={loginHref}
              joinHref={joinHref}
              onNavigate={handleAuthNavigate}
            />
          </div>
        ) : (
          <div className="saved-page-auth-stage">
            <SavedAuthGlassCard
              loginHref={loginHref}
              joinHref={joinHref}
              onNavigate={handleAuthNavigate}
            />
          </div>
        )
      ) : isReady && saved.length > 0 ? (
        <div className={isOverlay ? "saved-dropdown__list" : "mt-8"}>
          <TrainerList
            trainers={saved}
            variant="explore"
            priorityCount={4}
            impressionSurface="saved"
          />
        </div>
      ) : isSpecialistSignedIn ? (
        <div
          className={
            isOverlay
              ? "saved-dropdown__empty saved-dropdown__auth-block"
              : "explore-empty saved-dropdown__auth-block mt-10"
          }
        >
          <p className="saved-dropdown__auth-headline">Client account required</p>
          <p className="saved-dropdown__auth-lede">
            Specialist accounts cannot save trainers. Sign in as a client to
            build your shortlist.
          </p>
          <SavedPanelAuthCta
            loginHref={loginHref}
            loginLabel="Log in as client"
            onNavigate={handleAuthNavigate}
          />
        </div>
      ) : isClientLoadingSaves ? (
        <div
          className={isOverlay ? "saved-dropdown__empty" : "explore-empty mt-10"}
        >
          <p className="explore-empty__title">Loading your shortlist…</p>
          <p className="explore-empty__text">Syncing saved specialists.</p>
        </div>
      ) : isEmptyClient ? (
        <div
          className={isOverlay ? "saved-dropdown__empty" : "explore-empty mt-10"}
        >
          <p className="explore-empty__title">No specialists saved yet.</p>
          <p className="explore-empty__text">
            Tap the heart on a specialist profile to save them here.
          </p>
          <div className="explore-empty__actions">
            <Button href="/explore" variant="secondary">
              Explore specialists
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={isOverlay ? "saved-dropdown__empty" : "explore-empty mt-10"}
        >
          <p className="explore-empty__title">Sign in to save specialists</p>
          <p className="explore-empty__text">
            Create a client account to build your shortlist.
          </p>
          <div className="explore-empty__actions">
            <Link
              href={loginHref}
              className="explore-empty__btn"
              onClick={handleAuthNavigate}
            >
              Log in
            </Link>
            <Link
              href={joinHref}
              className="explore-empty__btn explore-empty__btn--ghost"
              onClick={handleAuthNavigate}
            >
              Create account
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
