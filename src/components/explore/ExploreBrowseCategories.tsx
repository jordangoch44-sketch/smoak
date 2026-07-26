"use client";

import type { ComponentType } from "react";
import {
  DumbbellIcon,
  LeafIcon,
  MedicalCrossIcon,
  MeditationIcon,
  RunningFigureIcon,
  StrengthArmIcon,
} from "@/components/ui/icons";
import {
  EXPLORE_BROWSE_CATEGORIES,
  type ExploreBrowseCategory,
  type ExploreBrowseCategoryIcon,
} from "@/lib/explore-browse-categories";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<
  ExploreBrowseCategoryIcon,
  ComponentType<{ className?: string }>
> = {
  dumbbell: DumbbellIcon,
  leaf: LeafIcon,
  running: RunningFigureIcon,
  strength: StrengthArmIcon,
  medical: MedicalCrossIcon,
  yoga: MeditationIcon,
};

interface ExploreBrowseCategoriesProps {
  onSelect: (category: ExploreBrowseCategory) => void;
  activeSearchQuery?: string;
  className?: string;
}

export function ExploreBrowseCategories({
  onSelect,
  activeSearchQuery = "",
  className,
}: ExploreBrowseCategoriesProps) {
  const active = activeSearchQuery.trim().toLowerCase();

  return (
    <section
      className={cn("explore-browse", className)}
      aria-labelledby="explore-browse-heading"
    >
      <header className="explore-browse__header">
        <h2 id="explore-browse-heading" className="explore-browse__title">
          Popular categories
        </h2>
      </header>

      <div className="explore-browse__grid">
        {EXPLORE_BROWSE_CATEGORIES.map((category) => {
          const Icon = CATEGORY_ICONS[category.icon];
          const isActive =
            active.length > 0 &&
            (active === category.searchQuery.toLowerCase() ||
              active === category.label.toLowerCase());

          return (
            <button
              key={category.id}
              type="button"
              className={cn(
                "smoac-control explore-browse__card",
                isActive && "explore-browse__card--active"
              )}
              onClick={() => onSelect(category)}
              aria-pressed={isActive}
            >
              <span className="explore-browse__card-icon" aria-hidden>
                <Icon className="explore-browse__card-svg" />
              </span>
              <span className="explore-browse__card-label">{category.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
