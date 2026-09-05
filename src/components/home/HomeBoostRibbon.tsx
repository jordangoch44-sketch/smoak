"use client";

import { useState, type CSSProperties } from "react";
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

function ChartMark() {
  return (
    <svg
      className="home-boost-card__mark-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4.5 16.5v-2.4M9 16.5V11M13.5 16.5V8.25" />
      <path d="M16.2 7.1l3.6-3.6M19.8 3.5H16.4M19.8 3.5V6.9" />
    </svg>
  );
}

function BoostVisual() {
  return (
    <span className="home-boost-card__visual" aria-hidden>
      <span className="home-boost-card__phone">
        <span className="home-boost-card__notch" />
        <span className="home-boost-card__avatar" />
        <span className="home-boost-card__stars">★★★★★</span>
        <span className="home-boost-card__lift">
          <svg viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M6 9.2V2.8M6 2.8L3.4 5.3M6 2.8l2.6 2.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </span>
      <span className="home-boost-card__growth">
        <span className="home-boost-card__bars">
          <span style={{ "--h": "32%" } as CSSProperties} />
          <span style={{ "--h": "52%" } as CSSProperties} />
          <span style={{ "--h": "74%" } as CSSProperties} />
          <span style={{ "--h": "100%" } as CSSProperties} />
        </span>
        <svg
          className="home-boost-card__trend"
          viewBox="0 0 28 28"
          fill="none"
          aria-hidden
        >
          <path
            d="M4 18.5 L12 11.5 L16.5 15 L24.5 6.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M17.5 6.5h7v7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="home-boost-card__growth-copy">
          More views
          <br />
          More clients
        </span>
      </span>
    </span>
  );
}

/**
 * Specialist-only marketplace card under Search.
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
      <button
        type="button"
        className="home-boost-card"
        aria-label="Boost your profile"
        onClick={() => setBoostOpen(true)}
      >
        <span className="home-boost-card__copy">
          <span className="home-boost-card__kicker">
            <span className="home-boost-card__mark">
              <ChartMark />
            </span>
            Get more clients
          </span>
          <span className="home-boost-card__title">Boost your profile</span>
          <span className="home-boost-card__sub">
            Show up higher in search and get in front of more clients.
          </span>
          <span className="home-boost-card__cta">
            Boost Now
            <span aria-hidden>→</span>
          </span>
        </span>
        <BoostVisual />
      </button>
      {boostOpen ? (
        <BoostVisibilityModal
          open={boostOpen}
          onClose={() => setBoostOpen(false)}
        />
      ) : null}
    </>
  );
}
