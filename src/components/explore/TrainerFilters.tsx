"use client";

import type { TrainerFilters as Filters } from "@/types";
import { MARKETPLACE_CITIES, getNeighborhoodsForCity } from "@/data/locations";
import {
  professions,
  specialties,
  genders,
  priceRanges,
} from "@/data/trainers";

interface TrainerFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  compact?: boolean;
  hideHeader?: boolean;
}

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
      city: "",
      neighborhood: "",
    });
  }

  function clearAll() {
    onChange({
      city: "",
      neighborhood: "",
      profession: "",
      specialty: "",
      gender: "",
      priceMax: "",
    });
  }

  const hasFilters = Object.values(filters).some(Boolean);
  const hasLocation = Boolean(filters.city || filters.neighborhood);

  return (
    <div className={compact ? "" : undefined}>
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

      <FilterSelect
        label="City"
        value={filters.city}
        onChange={updateCity}
        options={[
          { label: "All cities", value: "" },
          ...MARKETPLACE_CITIES.map((c) => ({ label: c, value: c })),
        ]}
      />

      <div className="explore-filter-field explore-filter-field--location">
        <div className="explore-filter-field__row">
          <label
            className="explore-filter-field__label"
            htmlFor="filter-neighborhood"
          >
            Neighborhood / area
          </label>
          {hasLocation ? (
            <button
              type="button"
              onClick={clearLocation}
              className="explore-filter-field__clear-link"
            >
              Clear location
            </button>
          ) : null}
        </div>
        <FilterSelect
          label="Neighborhood / area"
          hideLabel
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

      <FilterSelect
        label="Gender"
        value={filters.gender}
        onChange={(v) => update("gender", v)}
        options={[
          { label: "Any", value: "" },
          ...genders.map((g) => ({
            label: g.charAt(0).toUpperCase() + g.slice(1),
            value: g,
          })),
        ]}
      />

      <FilterSelect
        label="Price / session"
        value={filters.priceMax}
        onChange={(v) => update("priceMax", v)}
        options={priceRanges}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  disabled = false,
  placeholder,
  hideLabel = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  disabled?: boolean;
  placeholder?: string;
  hideLabel?: boolean;
}) {
  const isActive = Boolean(value) && !disabled;
  const id = `filter-${label.replace(/\W+/g, "-").toLowerCase()}`;

  return (
    <div className="explore-filter-field">
      {!hideLabel ? (
        <label className="explore-filter-field__label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <div className="explore-filter-select-wrap">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`explore-filter-select${isActive ? " explore-filter-select--active" : ""}${disabled ? " explore-filter-select--disabled" : ""}`}
          aria-label={hideLabel ? label : undefined}
        >
          {options.map((opt) => (
            <option key={opt.value || "all"} value={opt.value} disabled={disabled && opt.value !== ""}>
              {opt.label}
            </option>
          ))}
        </select>
        {disabled && placeholder ? (
          <span className="sr-only">{placeholder}</span>
        ) : null}
      </div>
    </div>
  );
}
