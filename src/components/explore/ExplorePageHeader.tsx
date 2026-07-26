"use client";

import type { TrainerFilters } from "@/types";

interface ExplorePageHeaderProps {
  filters: TrainerFilters;
  searchQuery: string;
}

/** Props kept for ExplorePageClient compatibility; copy matches Search mockup. */
export function ExplorePageHeader(props: ExplorePageHeaderProps) {
  void props;

  return (
    <header className="explore-page__header">
      <h1 className="explore-page__title">Search</h1>
      <p className="explore-page__subtitle">
        Find the right expert for your goals.
      </p>
    </header>
  );
}
