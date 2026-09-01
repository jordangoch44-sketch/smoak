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
  isExploreCategoryActive,
  type ExploreBrowseCategory,
  type ExploreBrowseCategoryIcon,
} from "@/lib/explore-browse-categories";
import type { TrainerFilters } from "@/types";
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
  filters?: TrainerFilters;
  activeProfession?: string;
  activeSpecialty?: string;
  className?: string;
  /** Compact block for Filters sheet (vs homepage-style section). */
  variant?: "page" | "drawer";
}

export function ExploreBrowseCategories({
  onSelect,
  activeSearchQuery = "",
  filters,
  activeProfession,
  activeSpecialty,
  className,
  variant = "page",
}: ExploreBrowseCategoriesProps) {
  const isDrawer = variant === "drawer";

  return (
    <section
      className={cn(
        "explore-browse",
        isDrawer && "explore-browse--drawer",
        className
      )}
      aria-labelledby="explore-browse-heading"
    >
      <header className="explore-browse__header">
        <h2 id="explore-browse-heading" className="explore-browse__title">
          {isDrawer ? "Categories" : "What are you looking for?"}
        </h2>
        {!isDrawer ? (
          <p className="explore-browse__subtitle">
            Tap a category to get started
          </p>
        ) : (
          <p className="explore-browse__subtitle">
            Jump into a specialty search
          </p>
        )}
      </header>

      <div className="explore-browse__grid">
        {EXPLORE_BROWSE_CATEGORIES.map((category) => {
          const Icon = CATEGORY_ICONS[category.icon];
          const isActive = isExploreCategoryActive(category, {
            activeSearchQuery,
            filters,
            activeProfession,
            activeSpecialty,
          });

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
