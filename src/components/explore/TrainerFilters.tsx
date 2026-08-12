"use client";

import { useCallback, useRef, useState } from "react";
import type { TrainerFilters as Filters } from "@/types";
import { exploreFiltersFromZipCode } from "@/lib/explore-location-filters";
import {
  completeGeolocationAsync,
  completeZipEntryAsync,
} from "@/lib/user-location-store";
import { normalizeZipCode } from "@/lib/zip-to-marketplace-city";
import { professions, specialties, genders } from "@/data/trainers";
import {
  EXPLORE_PRICE_RANGE,
  isFullExplorePriceRange,
  parseExplorePriceBound,
} from "@/lib/explore-price-range";
import { LocationMarkIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { PriceRangeSlider } from "./PriceRangeSlider";

interface TrainerFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  compact?: boolean;
  hideHeader?: boolean;
}

const GENDER_CHIPS: { label: string; value: string }[] = [
  { label: "Any", value: "" },
  { label: "Women", value: "female" },
  { label: "Men", value: "male" },
  { label: "Non-binary", value: "non-binary" },
];

/** Persist ZIP for proximity sort; chip shows ZIP without hard city/neighborhood exclude. */
function applyLocationFilters(filters: Filters, rawZip: string): Filters {
  const location = exploreFiltersFromZipCode(rawZip);
  return {
    ...filters,
    zipCode: location.zipCode,
    city: "",
    neighborhood: "",
  };
}

export function TrainerFilters({
  filters,
  onChange,
  compact = false,
  hideHeader = false,
}: TrainerFiltersProps) {
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const priceMinRaw = parseExplorePriceBound(
    filters.priceMin,
    EXPLORE_PRICE_RANGE.min
  );
  const priceMaxRaw = parseExplorePriceBound(
    filters.priceMax,
    EXPLORE_PRICE_RANGE.max
  );
  const priceMinValue = Math.min(priceMinRaw, priceMaxRaw);
  const priceMaxValue = Math.max(priceMinRaw, priceMaxRaw);

  function update(key: keyof Filters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  function clearLocation() {
    setGeoError(null);
    onChange({
      ...filters,
      zipCode: "",
      city: "",
      neighborhood: "",
    });
  }

  function applyZipInput(raw: string) {
    setGeoError(null);
    const zip = normalizeZipCode(raw);
    if (!zip) {
      onChange({
        ...filters,
        zipCode: raw.trim(),
        city: "",
        neighborhood: "",
      });
      return;
    }
    onChange(applyLocationFilters(filters, zip));
    void completeZipEntryAsync(zip);
  }

  function clearAll() {
    setGeoError(null);
    onChange({
      zipCode: "",
      city: "",
      neighborhood: "",
      profession: "",
      specialty: "",
      gender: "",
      priceMin: "",
      priceMax: "",
      serviceType: "",
    });
  }

  function handleUseCurrentLocation() {
    setGeoError(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Location is unavailable on this device. Enter a ZIP instead.");
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void (async () => {
          try {
            const result = await completeGeolocationAsync(
              position.coords.latitude,
              position.coords.longitude
            );
            if (!result.ok) {
              setGeoError(result.message);
              return;
            }
            if (!result.zip) {
              setGeoError(
                "Couldn’t find a ZIP for your location. Enter one below."
              );
              return;
            }
            onChange(applyLocationFilters(filtersRef.current, result.zip));
          } catch {
            setGeoError(
              "Couldn’t finish locating you. Enter a ZIP instead."
            );
          } finally {
            setGeoLoading(false);
          }
        })();
      },
      (error) => {
        setGeoLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError(
            "Location access was denied. Enter a ZIP below, or allow location in your browser settings."
          );
          return;
        }
        if (error.code === error.TIMEOUT) {
          setGeoError("Location timed out. Try again, or enter a ZIP.");
          return;
        }
        setGeoError("Couldn’t read your location. Enter a ZIP instead.");
      },
      {
        enableHighAccuracy: true,
        timeout: 20_000,
        maximumAge: 0,
      }
    );
  }

  const handlePriceRangeChange = useCallback(
    (minValue: number, maxValue: number) => {
      if (isFullExplorePriceRange(minValue, maxValue)) {
        onChange({ ...filters, priceMin: "", priceMax: "" });
        return;
      }
      onChange({
        ...filters,
        priceMin: String(minValue),
        priceMax: String(maxValue),
      });
    },
    [filters, onChange]
  );

  const hasFilters = Object.values(filters).some(Boolean);
  const hasLocation = Boolean(
    filters.zipCode || filters.city || filters.neighborhood
  );

  return (
    <div
      className={cn(
        "explore-filters-form",
        compact && "explore-filters-form--compact"
      )}
    >
      {!hideHeader && (
        <div className="explore-filters__header">
          <h2 className="explore-filters__title">Filters</h2>
          {hasFilters ? (
            <button
              type="button"
              onClick={clearAll}
              className="explore-filters__clear"
            >
              Clear all
            </button>
          ) : null}
        </div>
      )}

      <section
        className="explore-filter-section"
        aria-labelledby="filter-location-heading"
      >
        <div className="explore-filter-section__header">
          <h3
            id="filter-location-heading"
            className="explore-filter-section__title"
          >
            Location
          </h3>
          {hasLocation ? (
            <button
              type="button"
              onClick={clearLocation}
              className="explore-filter-section__clear"
            >
              Clear location
            </button>
          ) : null}
        </div>

        <button
          type="button"
          className={cn(
            "smoac-control explore-filter-location-btn",
            hasLocation && !geoLoading && "explore-filter-location-btn--active"
          )}
          onClick={handleUseCurrentLocation}
          disabled={geoLoading}
        >
          <span className="explore-filter-location-btn__icon" aria-hidden>
            <LocationMarkIcon className="h-4 w-4" />
          </span>
          <span className="explore-filter-location-btn__copy">
            <span className="explore-filter-location-btn__label">
              {geoLoading
                ? "Finding your location…"
                : "Use your current location"}
            </span>
            <span className="explore-filter-location-btn__hint">
              Show specialists near you
            </span>
          </span>
        </button>

        <div className="explore-filter-location-divider" aria-hidden>
          <span>or enter a ZIP</span>
        </div>

        <div className="explore-filter-field">
          <label className="explore-filter-field__label" htmlFor="filter-zip">
            ZIP code
          </label>
          <input
            id="filter-zip"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            value={filters.zipCode}
            placeholder="Enter ZIP"
            onChange={(e) => applyZipInput(e.target.value)}
            className={cn(
              "explore-filter-control",
              filters.zipCode && "explore-filter-control--selected"
            )}
          />
        </div>

        {geoError ? (
          <p className="explore-filter-location-error" role="status">
            {geoError}
          </p>
        ) : null}
      </section>

      <section
        className="explore-filter-section"
        aria-labelledby="filter-specialty-heading"
      >
        <div className="explore-filter-section__header">
          <h3
            id="filter-specialty-heading"
            className="explore-filter-section__title"
          >
            Specialty
          </h3>
        </div>

        <FilterSelect
          label="Profession"
          value={filters.profession}
          onChange={(v) => update("profession", v)}
          options={[
            { label: "All professions", value: "" },
            ...professions.map((p) => ({ label: p, value: p })),
          ]}
        />

        <FilterSelect
          label="Specialty"
          value={filters.specialty}
          onChange={(v) => update("specialty", v)}
          options={[
            { label: "All specialties", value: "" },
            ...specialties.map((s) => ({ label: s, value: s })),
          ]}
        />
      </section>

      <section
        className="explore-filter-section"
        aria-labelledby="filter-preferences-heading"
      >
        <div className="explore-filter-section__header">
          <h3
            id="filter-preferences-heading"
            className="explore-filter-section__title"
          >
            Preferences
          </h3>
        </div>

        <FilterChipGroup
          legend="Gender"
          value={filters.gender}
          onChange={(v) => update("gender", v)}
          options={GENDER_CHIPS.filter(
            (chip) =>
              chip.value === "" ||
              genders.includes(chip.value as (typeof genders)[number])
          )}
        />

        <PriceRangeSlider
          minValue={priceMinValue}
          maxValue={priceMaxValue}
          onChange={handlePriceRangeChange}
        />
      </section>
    </div>
  );
}

function FilterChipGroup({
  legend,
  value,
  onChange,
  options,
}: {
  legend: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string; hint?: string }[];
}) {
  return (
    <fieldset className="explore-filter-chips-field">
      <legend className="explore-filter-field__label">{legend}</legend>
      <div className="explore-filter-seg" role="group" aria-label={legend}>
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={`${opt.label}-${opt.value || "any"}`}
              type="button"
              className={cn(
                "smoac-control explore-filter-seg__chip",
                selected && "explore-filter-seg__chip--selected"
              )}
              aria-pressed={selected}
              title={opt.hint}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  disabled = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  disabled?: boolean;
  placeholder?: string;
}) {
  const isSelected = Boolean(value) && !disabled;
  const id = `filter-${label.replace(/\W+/g, "-").toLowerCase()}`;

  return (
    <div className="explore-filter-field">
      <label className="explore-filter-field__label" htmlFor={id}>
        {label}
      </label>
      <div className="explore-filter-select-wrap">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "explore-filter-control explore-filter-control--select",
            isSelected && "explore-filter-control--selected",
            disabled && "explore-filter-control--disabled"
          )}
          aria-label={placeholder ? `${label}. ${placeholder}` : label}
        >
          {options.map((opt) => (
            <option
              key={opt.value || "all"}
              value={opt.value}
              disabled={disabled && opt.value !== ""}
            >
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
