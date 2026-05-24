"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { trainingGoals } from "@/data/goals";
import { EMPTY_TRAINER_FILTERS } from "@/lib/explore";
import { buildExploreSearchParams } from "@/lib/explore-url";
import { recordRecentSearch } from "@/lib/recent-searches-store";
import { applySearchQueryToExploreState } from "@/lib/search-query-parser";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  showFilterChips?: boolean;
  variant?: "default" | "hero";
}

export function SearchBar({
  showFilterChips = false,
  variant = "default",
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const isHero = variant === "hero";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      router.push("/explore");
      return;
    }

    const applied = applySearchQueryToExploreState(trimmed, EMPTY_TRAINER_FILTERS);
    recordRecentSearch(applied.displayQuery);
    const params = buildExploreSearchParams(
      applied.filters,
      applied.displayQuery
    );
    router.push(`/explore?${params}`);
  }

  const formClass = cn(
    "overflow-hidden",
    isHero ? "hero-search__glass glass-panel" : "smoked-glass rounded-full md:rounded-3xl"
  );

  const chipClass = isHero
    ? "glass-chip inline-flex min-h-9 items-center rounded-full px-4 py-1.5 text-[13px] font-normal text-silver-200 md:px-4 md:text-sm md:hover:text-white"
    : "smoked-glass-chip inline-flex min-h-9 items-center rounded-full px-4 py-1.5 text-[13px] font-normal text-silver-200 md:px-4 md:text-sm md:hover:text-white";

  return (
    <div className={cn("w-full", isHero && "hero-search")}>
      <form onSubmit={handleSubmit} className={formClass}>
        <div className="relative z-[1] flex items-center">
          <label className="sr-only" htmlFor="hero-search">
            Search specialists
          </label>
          <input
            id="hero-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Specialist name, specialty, or city"
            className="min-h-[52px] min-w-0 flex-1 bg-transparent py-3 pl-5 pr-2 text-base text-white outline-none placeholder:text-silver-400/90 md:min-h-[60px] md:py-3.5 md:pl-6 md:pr-3 md:text-lg"
          />
          <button
            type="submit"
            className="mr-1.5 inline-flex shrink-0 items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold tracking-wide text-black shadow-[0_4px_24px_rgba(0,0,0,0.35)] transition-opacity active:opacity-90 md:mr-2 md:min-h-[48px] md:min-w-[140px] md:px-8 md:py-3 md:text-base"
          >
            Search
          </button>
        </div>
      </form>

      {showFilterChips && (
        <div
          className={cn(
            "flex flex-wrap gap-2",
            isHero ? "hero-search__chips" : "mt-4 md:mt-5 md:justify-center"
          )}
        >
          {trainingGoals.map((goal) => (
            <Link key={goal.id} href={goal.href} className={chipClass}>
              {goal.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
