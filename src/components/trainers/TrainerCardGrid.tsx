import type { Trainer } from "@/types";
import { formatProviderLocation } from "@/lib/provider-location";
import { formatPrice } from "@/lib/utils";
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
  const tags = trainer.specialty.slice(0, 2);

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
            <span className="font-medium text-white">{trainer.rating}</span>
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
        <p className="mt-1.5 text-xs text-silver-400">
          {formatProviderLocation(trainer)}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((s) => (
            <span
              key={s}
              className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-silver-300"
            >
              {s}
            </span>
          ))}
        </div>
        <p className="mt-auto pt-4 text-sm font-medium text-white">
          {formatPrice(trainer.pricePerSession)}
          <span className="font-normal text-silver-400"> / session</span>
        </p>
      </div>
    </article>
  );
}
