"use client";

import type { ComponentType } from "react";
import { TapLink } from "@/components/ui/TapLink";
import {
  AppleFruitIcon,
  DumbbellIcon,
  MedicalCrossIcon,
  MeditationIcon,
  RunningShoeIcon,
  SpineIcon,
} from "@/components/ui/icons";
import {
  HOME_BROWSE_CATEGORIES,
  type HomeBrowseCategoryIcon,
} from "@/lib/home-browse-categories";
import { withSlashLineBreak } from "@/lib/utils";

const CATEGORY_ICONS: Record<
  HomeBrowseCategoryIcon,
  ComponentType<{ className?: string }>
> = {
  dumbbell: DumbbellIcon,
  medical: MedicalCrossIcon,
  spine: SpineIcon,
  yoga: MeditationIcon,
  leaf: AppleFruitIcon,
  running: RunningShoeIcon,
};

export function Categories() {
  return (
    <section
      id="categories"
      className="home-specialty home-section-aurora"
      aria-labelledby="home-specialty-heading"
    >
      <div className="home-section__inner mx-auto max-w-7xl px-4 sm:px-6">
        <header className="home-section__header home-specialty__header">
          <h2 id="home-specialty-heading" className="home-section__title">
            Popular categories
          </h2>
        </header>

        <div className="home-specialty__grid">
          {HOME_BROWSE_CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category.icon];
            return (
              <TapLink
                key={category.id}
                href={category.href}
                className="home-specialty-card"
              >
                <span className="home-specialty-card__icon" aria-hidden>
                  <Icon className="home-specialty-card__svg" />
                </span>
                <span className="home-specialty-card__name">
                  {withSlashLineBreak(category.label)}
                </span>
              </TapLink>
            );
          })}
        </div>
      </div>
    </section>
  );
}
