"use client";

import { useCallback, useId } from "react";
import {
  EXPLORE_PRICE_RANGE,
  formatExplorePriceRangeLabel,
} from "@/lib/explore-price-range";
import { cn } from "@/lib/utils";

interface PriceRangeSliderProps {
  minValue: number;
  maxValue: number;
  onChange: (minValue: number, maxValue: number) => void;
  className?: string;
}

/**
 * Dual-thumb session price range — native range inputs for smooth touch + a11y.
 */
export function PriceRangeSlider({
  minValue,
  maxValue,
  onChange,
  className,
}: PriceRangeSliderProps) {
  const baseId = useId();
  const { min, max, step } = EXPLORE_PRICE_RANGE;

  const span = max - min || 1;
  const minPct = ((minValue - min) / span) * 100;
  const maxPct = ((maxValue - min) / span) * 100;

  const commitMin = useCallback(
    (next: number) => {
      const clamped = Math.min(next, maxValue);
      if (clamped !== minValue) onChange(clamped, maxValue);
    },
    [maxValue, minValue, onChange]
  );

  const commitMax = useCallback(
    (next: number) => {
      const clamped = Math.max(next, minValue);
      if (clamped !== maxValue) onChange(minValue, clamped);
    },
    [maxValue, minValue, onChange]
  );

  return (
    <div className={cn("explore-price-range", className)}>
      <div className="explore-price-range__header">
        <span className="explore-filter-field__label" id={`${baseId}-label`}>
          Price Per Session
        </span>
        <output
          className="explore-price-range__value"
          htmlFor={`${baseId}-min ${baseId}-max`}
          aria-live="polite"
        >
          {formatExplorePriceRangeLabel(minValue, maxValue)}
        </output>
      </div>

      <div
        className="explore-price-range__control"
        role="group"
        aria-labelledby={`${baseId}-label`}
      >
        <div className="explore-price-range__rail" aria-hidden>
          <div
            className="explore-price-range__fill"
            style={{
              left: `${minPct}%`,
              width: `${Math.max(0, maxPct - minPct)}%`,
            }}
          />
        </div>

        <input
          id={`${baseId}-min`}
          type="range"
          className="explore-price-range__input explore-price-range__input--min"
          min={min}
          max={max}
          step={step}
          value={minValue}
          aria-label="Minimum price per session"
          aria-valuemin={min}
          aria-valuemax={maxValue}
          aria-valuenow={minValue}
          aria-valuetext={formatExplorePriceRangeLabel(minValue, maxValue)}
          onChange={(event) => commitMin(Number(event.target.value))}
        />
        <input
          id={`${baseId}-max`}
          type="range"
          className="explore-price-range__input explore-price-range__input--max"
          min={min}
          max={max}
          step={step}
          value={maxValue}
          aria-label="Maximum price per session"
          aria-valuemin={minValue}
          aria-valuemax={max}
          aria-valuenow={maxValue}
          aria-valuetext={formatExplorePriceRangeLabel(minValue, maxValue)}
          onChange={(event) => commitMax(Number(event.target.value))}
        />
      </div>
    </div>
  );
}
