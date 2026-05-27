"use client";

import { TapLink } from "@/components/ui/TapLink";
import { trainingGoals } from "@/data/goals";
import { categories } from "@/data/categories";

export function Categories() {
  return (
    <section
      id="categories"
      className="home-section-aurora border-y border-white/5 bg-graphite-900 px-4 py-12 sm:px-6 sm:py-16 lg:py-20"
    >
      <div className="mx-auto max-w-7xl">
        <h2 className="text-xl font-medium tracking-tight text-white sm:text-2xl">
          Browse by goal
        </h2>
        <p className="mt-1 text-sm text-silver-400">
          Jump straight to the wellness specialty you need.
        </p>

        <div className="mt-5 flex flex-wrap gap-2 md:hidden">
          {trainingGoals.map((goal) => (
            <TapLink
              key={goal.id}
              href={goal.href}
              className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-black/40 px-4 text-sm text-silver-200 active:bg-white/10 active:text-white"
            >
              {goal.label}
            </TapLink>
          ))}
        </div>

        <div className="mt-6 hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <TapLink
              key={category.id}
              href={category.exploreHref}
              className="group rounded-2xl border border-white/5 bg-black p-5 transition-all hover:border-white/10 hover:bg-graphite-800"
            >
              <h3 className="text-lg font-medium text-white group-hover:text-accent">
                {category.name}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-silver-400">
                {category.description}
              </p>
            </TapLink>
          ))}
        </div>
      </div>
    </section>
  );
}
