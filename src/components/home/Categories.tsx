"use client";

import { TapLink } from "@/components/ui/TapLink";

/** Main marketplace categories only — no specialty sub-filters on the homepage. */
const CATEGORIES = [
  {
    id: "personal-trainer",
    emoji: "🏋️",
    name: "Personal Trainer",
    href: "/explore?profession=Personal+Trainer",
  },
  {
    id: "physical-therapist",
    emoji: "🩺",
    name: "Physical Therapist",
    href: "/explore?profession=Physical+Therapist",
  },
  {
    id: "nutritionist",
    emoji: "🥗",
    name: "Nutritionist",
    href: "/explore?profession=Nutritionist",
  },
  {
    id: "strength-coach",
    emoji: "💪",
    name: "Strength Coach",
    href: "/explore?profession=Strength+Coach",
  },
  {
    id: "yoga-instructor",
    emoji: "🧘",
    name: "Yoga Instructor",
    href: "/explore?profession=Yoga+Instructor",
  },
  {
    id: "running-coach",
    emoji: "🏃",
    name: "Running Coach",
    href: "/explore?profession=Running+Coach",
  },
] as const;

export function Categories() {
  return (
    <section
      id="categories"
      className="home-specialty home-section-aurora"
      aria-labelledby="home-specialty-heading"
    >
      <div className="home-section__inner mx-auto max-w-7xl px-4 sm:px-6">
        <header className="home-section__header">
          <h2 id="home-specialty-heading" className="home-section__title">
            Browse by category
          </h2>
        </header>

        <div className="home-specialty__grid">
          {CATEGORIES.map((category) => (
            <TapLink
              key={category.id}
              href={category.href}
              className="home-specialty-card"
            >
              <span className="home-specialty-card__emoji" aria-hidden>
                {category.emoji}
              </span>
              <span className="home-specialty-card__name">{category.name}</span>
            </TapLink>
          ))}
        </div>
      </div>
    </section>
  );
}
