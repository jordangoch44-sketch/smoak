import type { Trainer } from "@/types";
import { DevTrainerDistance } from "@/components/trainers/DevTrainerDistance";
import { LocationLabel } from "@/components/trainers/LocationLabel";
import { SpecialtyChips } from "@/components/trainers/SpecialtyChips";
import { SessionPrice } from "@/components/ui/SessionPrice";
import { formatTrainerRating } from "@/lib/utils";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";

interface TrainerCardGridProps {
  trainer: Trainer;
  priority?: boolean;
}

/** Vertical premium card — visible from md (768px) and above only. */
export function TrainerCardGrid({
  trainer,
  priority = false,
}: TrainerCardGridProps) {
  return (
    <article className="hidden flex-col overflow-hidden rounded-2xl border border-white/5 bg-graphite-900 transition-all duration-300 active:scale-[0.99] active:border-white/10 active:bg-graphite-800 md:flex md:group-hover:border-white/10 md:group-hover:bg-graphite-800">
      <div className="relative aspect-[4/5] overflow-hidden bg-graphite-800">
        <TrainerThumbnail
          src={trainer.image}
          name={trainer.name}
          size="card"
          priority={priority}
          className="absolute inset-0 h-full w-full rounded-none"
          imageClassName="transition-transform duration-500 md:group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="pointer-events-none absolute right-4 bottom-4 left-4">
          <div className="flex items-center gap-1 text-sm text-silver-200">
            <span className="text-white">★</span>
            <span className="font-medium text-white">
              {formatTrainerRating(trainer.rating)}
            </span>
            <span className="text-silver-400">({trainer.reviewCount})</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="text-lg font-medium tracking-tight text-white md:group-hover:text-accent">
          {trainer.name}
        </h3>
        <p className="mt-1 text-sm text-silver-400">{trainer.profession}</p>
        <p className="mt-0.5 text-xs text-silver-500">{trainer.title}</p>
        <LocationLabel
          provider={trainer}
          className="mt-1.5 text-xs text-silver-400"
        />
        <DevTrainerDistance trainer={trainer} className="mt-1 block" />
        <SpecialtyChips
          specialties={trainer.specialty}
          className="mt-3 specialty-chips--row"
        />
        <SessionPrice
          amount={trainer.pricePerSession}
          variant="grid"
          className="mt-auto block pt-4"
        />
      </div>
    </article>
  );
}
