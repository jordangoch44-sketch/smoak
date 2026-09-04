"use client";

import {
  RANKINGS_CITY_OPTIONS,
  RANKINGS_PROFESSION_OPTIONS,
} from "@/data/city-rankings";

interface RankingsFiltersProps {
  city: string;
  profession: string;
  onCityChange: (value: string) => void;
  onProfessionChange: (value: string) => void;
  cityOptions?: ReadonlyArray<{ value: string; label: string }>;
  professionOptions?: ReadonlyArray<{ value: string; label: string }>;
}

export function RankingsFilters({
  city,
  profession,
  onCityChange,
  onProfessionChange,
  cityOptions = RANKINGS_CITY_OPTIONS,
  professionOptions = RANKINGS_PROFESSION_OPTIONS,
}: RankingsFiltersProps) {
  return (
    <div className="rankings-filters grid grid-cols-2 gap-3">
      <label className="rankings-filter">
        <span className="rankings-filter__label">City</span>
        <span className="rankings-filter__control-wrap">
          <select
            className="rankings-filter__select"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            aria-label="Filter by city"
          >
            {cityOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </span>
      </label>

      <label className="rankings-filter">
        <span className="rankings-filter__label">Profession</span>
        <span className="rankings-filter__control-wrap">
          <select
            className="rankings-filter__select"
            value={profession}
            onChange={(e) => onProfessionChange(e.target.value)}
            aria-label="Filter by profession"
          >
            {professionOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </span>
      </label>
    </div>
  );
}
