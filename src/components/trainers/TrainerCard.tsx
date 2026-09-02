"use client";

/**
 * Responsive provider card (internal name TrainerCard).
 * TODO: Rename to ProviderCard; routes remain /trainers/[id] until migrated to /providers.
 * Save heart lives outside the card link (valid HTML + reliable stacking).
 */
import Link from "next/link";
import { memo, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Trainer } from "@/types";
import {
  TrainerCardCompact,
  type TrainerCardCompactLayout,
} from "./TrainerCardCompact";
import { TrainerCardGrid } from "./TrainerCardGrid";
import { TrainerCardSaveSlot } from "./TrainerCardSaveSlot";
import { TrainerVerifiedCheck } from "./TrainerVerifiedCheck";
import { SpecialistImpressionBeacon } from "./SpecialistImpressionBeacon";
import { isTrainerSponsored, isTrainerVerified } from "@/lib/trainer-sponsorship";
import { warmTrainerProfileNavigation } from "@/lib/warm-trainer-profile-navigation";

interface TrainerCardProps {
  trainer: Trainer;
  priority?: boolean;
  compactLayout?: TrainerCardCompactLayout;
  /** Search-appearance surface for analytics (default explore). */
  impressionSurface?: "explore" | "saved" | "client_dashboard";
  /** Disable profile link while compare mode is selecting saved cards. */
  linkDisabled?: boolean;
}

export const TrainerCard = memo(function TrainerCard({
  trainer,
  priority = false,
  compactLayout = "default",
  impressionSurface = "explore",
  linkDisabled = false,
}: TrainerCardProps) {
  const router = useRouter();
  const href = `/trainers/${trainer.id}`;
  const sponsored = isTrainerSponsored(trainer);
  const verified = isTrainerVerified(trainer);

  useEffect(() => {
    if (!priority) return;
    try {
      router.prefetch(href);
    } catch {
      /* prefetch is best-effort */
    }
  }, [priority, href, router]);

  function warm() {
    warmTrainerProfileNavigation(trainer, router);
  }

  const cardBody = (
    <>
      <TrainerCardCompact
        trainer={trainer}
        priority={priority}
        layout={compactLayout}
        sponsored={sponsored}
      />
      <TrainerCardGrid
        trainer={trainer}
        priority={priority}
        sponsored={sponsored}
      />
    </>
  );

  return (
    <div className="trainer-card relative w-full min-w-0 max-w-full overflow-hidden">
      <SpecialistImpressionBeacon
        specialistId={trainer.id}
        surface={impressionSurface}
      />
      {verified ? (
        <div className="trainer-card__top-left">
          <TrainerVerifiedCheck trainer={trainer} />
        </div>
      ) : null}
      {linkDisabled ? (
        <div className="block" aria-hidden={false}>
          {cardBody}
        </div>
      ) : (
        <Link
          href={href}
          className="block active:opacity-95"
          onPointerDown={warm}
          onClick={warm}
        >
          {cardBody}
        </Link>
      )}
      <TrainerCardSaveSlot trainerId={trainer.id} />
    </div>
  );
});
