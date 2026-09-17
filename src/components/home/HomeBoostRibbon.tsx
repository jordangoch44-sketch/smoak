"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { HomeBoostCard } from "@/components/home/HomeBoostCard";
import { useSpecialistGrowthAdsAllowed } from "@/hooks/useSpecialistGrowthAdsAllowed";

const BoostVisibilityModal = dynamic(
  () =>
    import("@/components/dashboard/shared/BoostVisibilityModalEntry").then(
      (mod) => mod.BoostVisibilityModal
    ),
  { ssr: false }
);

interface HomeBoostRibbonProps {
  className?: string;
}

/**
 * Specialist-only boost card. Hidden for guests, clients, and specialists
 * who are not yet admin-approved (onboarding, pending review, rejected).
 */
export function HomeBoostRibbon({ className }: HomeBoostRibbonProps = {}) {
  const { ready, allowed } = useSpecialistGrowthAdsAllowed();
  const [boostOpen, setBoostOpen] = useState(false);

  if (!ready || !allowed) return null;

  return (
    <>
      <HomeBoostCard className={className} onClick={() => setBoostOpen(true)} />
      {boostOpen ? (
        <BoostVisibilityModal
          open={boostOpen}
          onClose={() => setBoostOpen(false)}
        />
      ) : null}
    </>
  );
}
