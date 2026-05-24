"use client";

import { useMemo } from "react";
import type { Trainer } from "@/types";
import type { TrainerPricePosition } from "@/types/trainer-market-value";
import { buildTrainerMarketValue } from "@/lib/trainer-market-value";
import { cn, formatPrice } from "@/lib/utils";

interface TrainerMarketValueCardProps {
  trainer: Trainer;
}

function PricePositionIndicator({
  position,
}: {
  position: TrainerPricePosition;
}) {
  if (position === "within") return null;

  const isBelow = position === "below";

  return (
    <span
      className={cn(
        "smoac-value__position",
        isBelow ? "smoac-value__position--below" : "smoac-value__position--above"
      )}
      aria-hidden
    >
      <svg
        className="smoac-value__position-icon"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {isBelow ? (
          <path d="M6 3.5v4M3.5 6 6 8.5 8.5 6" />
        ) : (
          <path d="M6 8.5V4.5M3.5 6 6 3.5 8.5 6" />
        )}
      </svg>
    </span>
  );
}

export function TrainerMarketValueCard({ trainer }: TrainerMarketValueCardProps) {
  const marketValue = useMemo(
    () => buildTrainerMarketValue(trainer),
    [trainer]
  );

  const { inputs } = marketValue;
  const rangeLabel = `${formatPrice(inputs.trainerPricingLow)}–${formatPrice(inputs.trainerPricingHigh)}`;

  return (
    <article
      className="smoac-value"
      aria-labelledby="smoac-value-heading"
      data-price-position={marketValue.pricePosition}
    >
      <div className="smoac-value__glow" aria-hidden />
      <div className="smoac-value__inner">
        <header className="smoac-value__header">
          <div className="smoac-value__title-row">
            <h2 id="smoac-value-heading" className="smoac-value__brand">
              SMOAC Value™
            </h2>
            <span className="smoac-value__evaluated">Market evaluated</span>
          </div>

          <div className="smoac-value__score-block">
            <div className="smoac-value__score-ring" aria-hidden>
              <div className="smoac-value__score-pulse" />
            </div>
            <p className="smoac-value__score" aria-label={`SMOAC Value score ${marketValue.score} out of 100`}>
              <span className="smoac-value__score-value">{marketValue.score}</span>
              <span className="smoac-value__score-denom">/ 100</span>
            </p>
            <p className="smoac-value__tier">{marketValue.tierLabel}</p>
          </div>
        </header>

        <div className="smoac-value__divider" role="presentation" />

        <dl className="smoac-value__rates">
          <div className="smoac-value__rate-row">
            <dt className="smoac-value__rate-label">Estimated Fair Market Rate</dt>
            <dd className="smoac-value__rate-value">{rangeLabel}/session</dd>
          </div>
          <div className="smoac-value__rate-row smoac-value__rate-row--listed">
            <dt className="smoac-value__rate-label">Listed Rate</dt>
            <dd className="smoac-value__rate-value smoac-value__rate-value--listed">
              <PricePositionIndicator position={marketValue.pricePosition} />
              <span>
                {formatPrice(inputs.trainerListedPrice)}
                <span className="smoac-value__rate-suffix">/session</span>
              </span>
            </dd>
          </div>
        </dl>

        <p className="smoac-value__explanation">{marketValue.explanation}</p>
      </div>
    </article>
  );
}
