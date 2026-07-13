"use client";

import { useAuthSession } from "@/hooks/useAuthSession";
import { getExploreLocationSubtitle } from "@/lib/explore-location-subtitle";
import type { TrainerFilters } from "@/types";

interface ExplorePageHeaderProps {
  filters: TrainerFilters;
  searchQuery: string;
}

export function ExplorePageHeader({
  filters,
  searchQuery,
}: ExplorePageHeaderProps) {
  const { session } = useAuthSession();
  const subtitle = getExploreLocationSubtitle({
    filters,
    session,
    searchQuery,
  });

  return (
    <header className="explore-page__header">
      <h1 className="explore-page__title">Explore Specialists</h1>
      <p className="explore-page__subtitle">{subtitle}</p>
    </header>
  );
}
