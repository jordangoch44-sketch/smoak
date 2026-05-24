import type { Trainer } from "@/types";
import { formatProviderLocation } from "@/lib/provider-location";
import { formatPrice } from "@/lib/utils";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";

interface TrainerCardCompactProps {
  trainer: Trainer;
  priority?: boolean;
}

/** Horizontal list row — visible only below md (768px). */
export function TrainerCardCompact({
  trainer,
  priority = false,
}: TrainerCardCompactProps) {
  const tags = trainer.specialty.slice(0, 3);

  return (
    <article className="flex h-[132px] min-h-[120px] max-h-[150px] flex-row gap-3 overflow-hidden rounded-2xl border border-white/5 bg-graphite-900 p-3 transition-colors active:border-white/10 active:bg-graphite-800 md:hidden">
      <TrainerThumbnail
        src={trainer.image}
        name={trainer.name}
        size="compact"
        priority={priority}
      />
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div className="min-w-0 space-y-0.5">
          <h3 className="truncate text-[15px] font-medium leading-tight text-white">
            {trainer.name}
          </h3>
          <p className="truncate text-xs leading-snug text-silver-400">
            {trainer.profession}
          </p>
          <p className="truncate text-[11px] leading-snug text-silver-500">
            {formatProviderLocation(trainer)}
          </p>
        </div>

        <div className="flex items-end justify-between gap-2 pt-1">
          <div className="flex min-w-0 flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-white/8 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-silver-300"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="shrink-0 text-right">
            <div className="flex items-center justify-end gap-0.5 text-[11px] leading-none">
              <span className="text-white/90">★</span>
              <span className="font-medium text-white">{trainer.rating}</span>
              <span className="text-silver-500">({trainer.reviewCount})</span>
            </div>
            <p className="mt-0.5 text-xs font-medium leading-none text-white">
              {formatPrice(trainer.pricePerSession)}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
