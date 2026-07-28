"use client";

import { TapLink } from "@/components/ui/TapLink";

const SPECIALTIES = [
  {
    id: "personal-training",
    emoji: "🏋️",
    name: "Personal Training",
    href: "/explore?profession=Personal+Trainer",
  },
  {
    id: "physical-therapy",
    emoji: "🩺",
    name: "Physical Therapy",
    href: "/explore?profession=Physical+Therapist",
  },
  {
    id: "nutrition",
    emoji: "🥗",
    name: "Nutrition",
    href: "/explore?specialty=Nutrition+Coaching",
  },
  {
    id: "recovery",
    emoji: "🏃",
    name: "Recovery",
    href: "/explore?specialty=Recovery",
  },
  {
    id: "mobility",
    emoji: "🧘",
    name: "Mobility",
    href: "/explore?specialty=Mobility",
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
            Browse by Specialty
          </h2>
        </header>

        <div className="home-specialty__grid">
          {SPECIALTIES.map((specialty) => (
            <TapLink
              key={specialty.id}
              href={specialty.href}
              className="home-specialty-card"
            >
              <span className="home-specialty-card__emoji" aria-hidden>
                {specialty.emoji}
              </span>
              <span className="home-specialty-card__name">{specialty.name}</span>
            </TapLink>
          ))}
        </div>
      </div>
    </section>
  );
}
