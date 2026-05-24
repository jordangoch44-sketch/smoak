import Link from "next/link";
import { getFeaturedTrainers } from "@/data/trainers";
import { TrainerList } from "@/components/trainers";

/** TODO: Rename to FeaturedProviders when internal trainer types are refactored */
export function FeaturedTrainers() {
  const featured = getFeaturedTrainers().slice(0, 4);

  return (
    <section className="home-featured home-section-aurora px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-silver-400">
              Top rated near you
            </p>
            <h2 className="mt-1.5 text-xl font-medium tracking-tight text-white sm:text-2xl">
              Featured specialists
            </h2>
            <p className="mt-1 text-sm text-silver-400">
              Vetted specialists with verified reviews and clear session
              pricing.
            </p>
          </div>
          <Link
            href="/explore"
            className="hidden shrink-0 text-sm text-silver-400 transition-colors hover:text-white sm:inline-flex sm:min-h-11 sm:items-center"
          >
            View all →
          </Link>
        </div>

        <TrainerList
          trainers={featured}
          variant="featured"
          priorityCount={4}
          className="mt-8"
        />

        <Link
          href="/explore"
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-white/10 text-sm text-silver-300 active:bg-white/5 active:text-white sm:hidden"
        >
          Explore specialists
        </Link>
      </div>
    </section>
  );
}
