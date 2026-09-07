"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { HomeBoostCard } from "@/components/home/HomeBoostCard";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useHydrated } from "@/hooks/useHydrated";

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
 * Specialist-only boost card. Hidden for guests and clients.
 */
export function HomeBoostRibbon({ className }: HomeBoostRibbonProps = {}) {
  const hydrated = useHydrated();
  const { session, isReady } = useAuthSession();
  const [boostOpen, setBoostOpen] = useState(false);

  const show = hydrated && isReady && session?.role === "specialist";

  if (!show) return null;

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
