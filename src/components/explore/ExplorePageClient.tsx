"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { trainers } from "@/data/trainers";
import { filterTrainers } from "@/lib/utils";
import type { TrainerFilters } from "@/types/trainer";
import { TrainerCard } from "@/components/trainers/TrainerCard";
import { TrainerFilters as FiltersPanel } from "./TrainerFilters";

export function ExplorePageClient() {
  const searchParams = useSearchParams();
  const initialSpecialty = searchParams.get("specialty") ?? "";
  const initialQuery = searchParams.get("q") ?? "";

  const [filters, setFilters] = useState<TrainerFilters>({
    location: "",
    specialty: initialSpecialty,
    gender: "",
    priceMax: "",
  });

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = filterTrainers(trainers, filters);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.city.toLowerCase().includes(q) ||
          t.specialty.some((s) => s.toLowerCase().includes(q))
      );
    }

    return result;
  }, [filters, searchQuery]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-28 lg:py-32">
      <div className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-silver-400">
          Discover
        </p>
        <h1 className="mt-2 text-4xl font-light tracking-tight text-white sm:text-5xl">
          Explore Trainers
        </h1>
        <p className="mt-4 text-silver-400">
          {filtered.length} elite coach{filtered.length !== 1 ? "es" : ""}{" "}
          available
        </p>
      </div>

      <div className="mt-8">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search trainers..."
          className="w-full max-w-md rounded-full border border-white/10 bg-graphite-800 px-6 py-3 text-sm text-white outline-none transition-colors focus:border-white/20"
        />
      </div>

      <button
        type="button"
        onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
        className="mt-6 flex w-full items-center justify-between rounded-xl border border-white/10 bg-graphite-800 px-4 py-3 text-sm text-white lg:hidden"
      >
        <span>Filters</span>
        <span className="text-silver-400">{mobileFiltersOpen ? "−" : "+"}</span>
      </button>

      <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:gap-16">
        <aside
          className={`lg:w-64 lg:shrink-0 ${
            mobileFiltersOpen ? "block" : "hidden lg:block"
          }`}
        >
          <div className="sticky top-28 rounded-2xl border border-white/5 bg-graphite-900 p-6">
            <FiltersPanel filters={filters} onChange={setFilters} />
          </div>
        </aside>

        <div className="flex-1">
          {filtered.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((trainer) => (
                <TrainerCard key={trainer.id} trainer={trainer} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-graphite-900 py-20 text-center">
              <p className="text-lg text-white">No trainers found</p>
              <p className="mt-2 text-sm text-silver-400">
                Try adjusting your filters or search query
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
