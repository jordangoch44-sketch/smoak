import Link from "next/link";
import { getFeaturedTrainers } from "@/data/trainers";
import { TrainerCard } from "@/components/trainers/TrainerCard";

export function FeaturedTrainers() {
  const featured = getFeaturedTrainers();

  return (
    <section className="px-6 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-silver-400">
              Curated Selection
            </p>
            <h2 className="mt-2 text-3xl font-light tracking-tight text-white sm:text-4xl">
              Featured Trainers
            </h2>
          </div>
          <Link
            href="/explore"
            className="text-sm text-silver-400 transition-colors hover:text-white"
          >
            View all →
          </Link>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((trainer) => (
            <TrainerCard key={trainer.id} trainer={trainer} />
          ))}
        </div>
      </div>
    </section>
  );
}
