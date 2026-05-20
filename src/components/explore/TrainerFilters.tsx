"use client";

import type { TrainerFilters as Filters } from "@/types/trainer";
import {
  locations,
  specialties,
  genders,
  priceRanges,
} from "@/data/trainers";

interface TrainerFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export function TrainerFilters({ filters, onChange }: TrainerFiltersProps) {
  function update(key: keyof Filters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  function clearAll() {
    onChange({
      location: "",
      specialty: "",
      gender: "",
      priceMax: "",
    });
  }

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-widest text-silver-300">
          Filters
        </h2>
        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-silver-400 transition-colors hover:text-white"
          >
            Clear all
          </button>
        )}
      </div>

      <FilterSelect
        label="Location"
        value={filters.location}
        onChange={(v) => update("location", v)}
        options={[
          { label: "All locations", value: "" },
          ...locations.map((l) => ({ label: l, value: l })),
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
        label="Price"
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div>
      <label className="mb-2 block text-xs text-silver-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-white/10 bg-graphite-800 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/20"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-graphite-800">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
