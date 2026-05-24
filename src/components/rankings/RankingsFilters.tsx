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
}

export function RankingsFilters({
  city,
  profession,
  onCityChange,
  onProfessionChange,
}: RankingsFiltersProps) {
  return (
    <div className="rankings-filters">
      <label className="rankings-filter">
        <span className="rankings-filter__label">City</span>
        <span className="rankings-filter__control-wrap">
          <select
            className="rankings-filter__select"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            aria-label="Filter by city"
          >
            {RANKINGS_CITY_OPTIONS.map((option) => (
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
            {RANKINGS_PROFESSION_OPTIONS.map((option) => (
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
