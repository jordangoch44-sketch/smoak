"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useHydrated } from "@/hooks/useHydrated";

const BoostVisibilityModal = dynamic(
  () =>
    import("@/components/dashboard/shared/BoostVisibilityModalEntry").then(
      (mod) => mod.BoostVisibilityModal
    ),
  { ssr: false }
);

/**
 * Specialist-only marketplace nudge under Search.
 * Hidden for guests and clients.
 */
export function HomeBoostRibbon() {
  const hydrated = useHydrated();
  const { session, isReady } = useAuthSession();
  const [boostOpen, setBoostOpen] = useState(false);

  const show = hydrated && isReady && session?.role === "specialist";

  if (!show) return null;

  return (
    <>
      <div className="home-boost-ribbon">
        <button
          type="button"
          className="home-boost-ribbon__btn"
          onClick={() => setBoostOpen(true)}
        >
          <span className="home-boost-ribbon__mark" aria-hidden>
            <svg
              className="home-boost-ribbon__glyph"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4.5 16.5v-2.25M9 16.5V11M13.5 16.5V8.25" />
              <path d="M15.75 6.5l4-4M19.75 2.5H16M19.75 2.5V6.25" />
            </svg>
          </span>
          <span className="home-boost-ribbon__flag">
            Boost your profile to be seen.
          </span>
        </button>
      </div>
      {boostOpen ? (
        <BoostVisibilityModal
          open={boostOpen}
          onClose={() => setBoostOpen(false)}
        />
      ) : null}
    </>
  );
}
