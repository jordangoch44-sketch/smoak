"use client";

import type { ComponentType } from "react";
import { TapLink } from "@/components/ui/TapLink";
import {
  AthleticBallIcon,
  DumbbellIcon,
  LeafIcon,
  MeditationIcon,
  RunningFigureIcon,
  StrengthArmIcon,
} from "@/components/ui/icons";
import {
  HOME_BROWSE_CATEGORIES,
  HOME_VIEW_ALL_SPECIALISTS_HREF,
  type HomeBrowseCategoryIcon,
} from "@/lib/home-browse-categories";

const CATEGORY_ICONS: Record<
  HomeBrowseCategoryIcon,
  ComponentType<{ className?: string }>
> = {
  dumbbell: DumbbellIcon,
  strength: StrengthArmIcon,
  leaf: LeafIcon,
  yoga: MeditationIcon,
  sports: AthleticBallIcon,
  running: RunningFigureIcon,
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
            Browse by category
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
                <span className="home-specialty-card__name">{category.label}</span>
              </TapLink>
            );
          })}
        </div>

        <div className="home-specialty__footer">
          <TapLink
            href={HOME_VIEW_ALL_SPECIALISTS_HREF}
            className="home-specialty__view-all"
          >
            View all specialists
            <span aria-hidden>→</span>
          </TapLink>
        </div>
      </div>
    </section>
  );
}
