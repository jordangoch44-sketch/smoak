"use client";

import Link from "next/link";
import { useSavedTrainers } from "@/hooks/useSavedTrainers";
import { TrainerList } from "@/components/trainers";
import { Button } from "@/components/ui/Button";

interface SavedPanelContentProps {
  /** Overlay dropdown vs full /saved page */
  variant?: "overlay" | "page";
}

/** Shared saved specialists list — overlay panel and /saved route */
export function SavedPanelContent({ variant = "overlay" }: SavedPanelContentProps) {
  const { getSavedTrainers, isReady } = useSavedTrainers();
  const saved = getSavedTrainers();
  const isOverlay = variant === "overlay";

  return (
    <div
      className={
        isOverlay ? "saved-dropdown__content" : "saved-page mx-auto max-w-7xl"
      }
    >
      <div className={isOverlay ? undefined : "max-w-2xl"}>
        <h2
          className={
            isOverlay
              ? "saved-dropdown__title"
              : "text-2xl font-medium tracking-tight text-white sm:text-3xl md:text-4xl"
          }
          id="saved-panel-title"
        >
          Saved specialists
        </h2>
        <p
          className={
            isOverlay
              ? "saved-dropdown__subtitle"
              : "mt-2 text-sm text-silver-400 sm:text-base"
          }
        >
          {isReady
            ? saved.length > 0
              ? `${saved.length} specialist${saved.length !== 1 ? "s" : ""} saved on this device`
              : "Your saved library is empty."
            : "Loading saved specialists…"}
        </p>
      </div>

      {isReady && saved.length > 0 ? (
        <div className={isOverlay ? "saved-dropdown__list" : "mt-8"}>
          <TrainerList trainers={saved} variant="explore" priorityCount={4} />
        </div>
      ) : isReady ? (
        <div className={isOverlay ? "saved-dropdown__empty" : "explore-empty mt-10"}>
          <p className="explore-empty__title">No saved specialists yet</p>
          <p className="explore-empty__text">
            Tap the heart on a specialist profile to save them here.
          </p>
          <div className="explore-empty__actions">
            <Button
              href="/explore"
              className="explore-empty__btn explore-empty__btn--primary w-full"
            >
              Explore specialists
            </Button>
          </div>
        </div>
      ) : null}

      {isReady && saved.length > 0 ? (
        <p className={isOverlay ? "saved-dropdown__footer" : "mt-10 text-center"}>
          <Link
            href="/explore"
            className="text-sm text-silver-400 transition-colors hover:text-white"
          >
            Find more specialists on Explore →
          </Link>
        </p>
      ) : null}
    </div>
  );
}
