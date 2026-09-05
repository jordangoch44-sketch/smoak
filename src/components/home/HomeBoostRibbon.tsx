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

function SparkleMark() {
  return (
    <svg
      className="home-boost-card__mark-icon"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 1.4 13.72 10.28 22.6 12 13.72 13.72 12 22.6 10.28 13.72 1.4 12 10.28 10.28Z" />
    </svg>
  );
}

function EyeMark() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M1.5 8s2.4-4.2 6.5-4.2S14.5 8 14.5 8s-2.4 4.2-6.5 4.2S1.5 8 1.5 8Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="1.85" fill="currentColor" />
    </svg>
  );
}

function SearchPlusMark() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="8.4" cy="8.4" r="5.1" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12.2 12.2 17 17"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M8.4 6.2v4.4M6.2 8.4h4.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PeopleMark() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="7.4" cy="7.2" r="2.35" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3.4 15.4c.35-2.55 2-3.9 4-3.9s3.65 1.35 4 3.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="13.6" cy="7.6" r="1.9" stroke="currentColor" strokeWidth="1.45" />
      <path
        d="M12.15 11.7c1.55-.2 2.85.7 3.35 2.55"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BarsMark() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M4.2 15.4V10.8M9.2 15.4V7.4M14.2 15.4V4.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BoostVisual() {
  return (
    <span className="home-boost-card__visual" aria-hidden>
      <span className="home-boost-card__stage">
        <span className="home-boost-card__phone">
          <span className="home-boost-card__notch" />
          <span className="home-boost-card__screen">
            <span className="home-boost-card__screen-line" />
            <span className="home-boost-card__screen-bars">
              <span />
              <span />
              <span />
              <span />
            </span>
          </span>
        </span>
        <svg
          className="home-boost-card__rise"
          viewBox="0 0 48 48"
          fill="none"
        >
          <path
            d="M8 34 L20 22 L27 28 L40 12"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M28 12h12v12"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="home-boost-card__views">
          <EyeMark />
          3.2x more views
        </span>
        <span className="home-boost-card__people">
          <span className="home-boost-card__face home-boost-card__face--a" />
          <span className="home-boost-card__face home-boost-card__face--b" />
          <span className="home-boost-card__face home-boost-card__face--c" />
          <span className="home-boost-card__face home-boost-card__face--d" />
        </span>
        <span className="home-boost-card__stars">★★★★★</span>
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
        <span className="home-boost-card__main">
          <span className="home-boost-card__copy">
            <span className="home-boost-card__kicker">
              <span className="home-boost-card__mark">
                <SparkleMark />
              </span>
              Grow your business
            </span>
            <span className="home-boost-card__title">Boost Your Profile</span>
            <span className="home-boost-card__sub">
              Show up higher in search, get more views, and connect with more
              clients.
            </span>
            <span className="home-boost-card__cta">
              Boost Now
              <span aria-hidden>→</span>
            </span>
          </span>
          <BoostVisual />
        </span>
        <span className="home-boost-card__features" aria-hidden>
          <span className="home-boost-card__feature">
            <SearchPlusMark />
            Higher Placement
          </span>
          <span className="home-boost-card__feature">
            <PeopleMark />
            More Clients
          </span>
          <span className="home-boost-card__feature">
            <BarsMark />
            Real Results
          </span>
        </span>
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
