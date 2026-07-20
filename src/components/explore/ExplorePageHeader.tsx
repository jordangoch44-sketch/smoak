"use client";

import type { TrainerFilters } from "@/types";

interface ExplorePageHeaderProps {
  filters: TrainerFilters;
  searchQuery: string;
}

/** Props kept for ExplorePageClient compatibility; copy is static. */
export function ExplorePageHeader(props: ExplorePageHeaderProps) {
  void props;

  return (
    <header className="explore-page__header">
      <h1 className="explore-page__title">Search</h1>
      <p className="explore-page__subtitle">
        Search by name, profession, specialty, or location.
      </p>
    </header>
  );
}
