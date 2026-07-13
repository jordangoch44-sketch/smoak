"use client";

import type { TrainerFilters as Filters } from "@/types";
import { MARKETPLACE_CITIES, getNeighborhoodsForCity } from "@/data/locations";
import { exploreFiltersFromZipCode } from "@/lib/explore-location-filters";
import { normalizeZipCode } from "@/lib/zip-to-marketplace-city";
import {
  professions,
  specialties,
  genders,
  priceRanges,
} from "@/data/trainers";
import { cn } from "@/lib/utils";

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

const PRICE_CHIPS: { label: string; value: string; hint: string }[] = [
  { label: "Any", value: "", hint: "Any price" },
  { label: "$", value: "130", hint: "Under $130" },
  { label: "$$", value: "150", hint: "Under $150" },
  { label: "$$$", value: "200", hint: "Under $200" },
];

export function TrainerFilters({
  filters,
  onChange,
  compact = false,
  hideHeader = false,
}: TrainerFiltersProps) {
  const neighborhoods = getNeighborhoodsForCity(filters.city);
  const citySelected = Boolean(filters.city);

  function update(key: keyof Filters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  function updateCity(value: string) {
    onChange({
      ...filters,
      city: value,
      neighborhood: "",
    });
  }

  function clearLocation() {
    onChange({
      ...filters,
      zipCode: "",
      city: "",
      neighborhood: "",
    });
  }

  function applyZipInput(raw: string) {
    const zip = normalizeZipCode(raw);
    if (!zip) {
      onChange({ ...filters, zipCode: raw.trim() });
      return;
    }
    onChange(exploreFiltersFromZipCode(zip));
  }

  function clearAll() {
    onChange({
      zipCode: "",
      city: "",
      neighborhood: "",
      profession: "",
      specialty: "",
      gender: "",
      priceMax: "",
    });
  }

  const hasFilters = Object.values(filters).some(Boolean);
  const hasLocation = Boolean(
    filters.zipCode || filters.city || filters.neighborhood
  );

  /* Preserve non-chip price values (e.g. 175) as a selected select-like chip state */
  const priceChipValues = new Set(PRICE_CHIPS.map((c) => c.value));
  const priceIsCustom =
    Boolean(filters.priceMax) && !priceChipValues.has(filters.priceMax);

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

      <section className="explore-filter-section" aria-labelledby="filter-location-heading">
        <div className="explore-filter-section__header">
          <h3 id="filter-location-heading" className="explore-filter-section__title">
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

        <FilterSelect
          label="City"
          value={filters.city}
          onChange={updateCity}
          options={[
            { label: "Select location", value: "" },
            ...MARKETPLACE_CITIES.map((c) => ({ label: c, value: c })),
          ]}
        />

        <FilterSelect
          label="Neighborhood / area"
          value={filters.neighborhood}
          onChange={(v) => update("neighborhood", v)}
          disabled={!citySelected}
          placeholder={
            citySelected
              ? "Select neighborhood or area"
              : "Select a city first"
          }
          options={[
            {
              label: citySelected
                ? "All neighborhoods in city"
                : "Select a city first",
              value: "",
            },
            ...neighborhoods.map((n) => ({ label: n, value: n })),
          ]}
        />
      </section>

      <section className="explore-filter-section" aria-labelledby="filter-specialty-heading">
        <div className="explore-filter-section__header">
          <h3 id="filter-specialty-heading" className="explore-filter-section__title">
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

      <section className="explore-filter-section" aria-labelledby="filter-preferences-heading">
        <div className="explore-filter-section__header">
          <h3 id="filter-preferences-heading" className="explore-filter-section__title">
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

        <FilterChipGroup
          legend="Price / session"
          value={priceIsCustom ? filters.priceMax : filters.priceMax}
          onChange={(v) => update("priceMax", v)}
          options={
            priceIsCustom
              ? [
                  ...PRICE_CHIPS,
                  {
                    label:
                      priceRanges.find((p) => p.value === filters.priceMax)
                        ?.label ?? `Under $${filters.priceMax}`,
                    value: filters.priceMax,
                    hint: "Current",
                  },
                ]
              : PRICE_CHIPS
          }
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
