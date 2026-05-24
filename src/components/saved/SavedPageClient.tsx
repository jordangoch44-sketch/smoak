"use client";

import Link from "next/link";
import { useSavedTrainers } from "@/hooks/useSavedTrainers";
import { TrainerList } from "@/components/trainers";
import { Button } from "@/components/ui/Button";

/** TODO: Rename saved-trainers → saved-providers when routes/types are refactored */
export function SavedPageClient() {
  const { getSavedTrainers, isReady } = useSavedTrainers();
  const saved = getSavedTrainers();

  return (
    <div className="saved-page mx-auto max-w-7xl px-4 pb-12 pt-[calc(3.5rem+env(safe-area-inset-top,0px)+1.25rem)] sm:px-6 sm:pb-16 md:pt-28 lg:py-32">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-medium tracking-tight text-white sm:text-3xl md:text-4xl">
          Saved specialists
        </h1>
        <p className="mt-2 text-sm text-silver-400 sm:text-base">
          {isReady
            ? saved.length > 0
              ? `${saved.length} specialist${saved.length !== 1 ? "s" : ""} saved on this device`
              : "Your saved library is empty."
            : "Loading saved specialists…"}
        </p>
      </div>

      {isReady && saved.length > 0 ? (
        <div className="mt-8">
          <TrainerList trainers={saved} variant="explore" priorityCount={4} />
        </div>
      ) : isReady ? (
        <div className="explore-empty mt-10">
          <p className="explore-empty__title">No saved specialists yet</p>
          <p className="explore-empty__text">
            Tap the heart on a specialist profile to save them here.
          </p>
          <div className="explore-empty__actions">
            <Button href="/explore" className="explore-empty__btn explore-empty__btn--primary w-full">
              Explore specialists
            </Button>
          </div>
        </div>
      ) : null}

      {isReady && saved.length > 0 ? (
        <p className="mt-10 text-center">
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
