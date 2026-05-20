import Image from "next/image";
import type { Trainer } from "@/types/trainer";
import { formatPrice } from "@/lib/utils";

interface ProfileHeroProps {
  trainer: Trainer;
}

export function ProfileHero({ trainer }: ProfileHeroProps) {
  return (
    <section className="relative h-[50vh] min-h-[400px] w-full overflow-hidden lg:h-[55vh]">
      <Image
        src={trainer.heroImage}
        alt={trainer.name}
        fill
        className="object-cover"
        priority
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 px-6 pb-12 lg:pb-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-6">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-white/20 sm:h-32 sm:w-32">
                <Image
                  src={trainer.image}
                  alt={trainer.name}
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              </div>
              <div>
                <h1 className="text-3xl font-light tracking-tight text-white sm:text-4xl lg:text-5xl">
                  {trainer.name}
                </h1>
                <p className="mt-1 text-silver-300">{trainer.title}</p>
                <p className="mt-2 text-sm text-silver-400">
                  {trainer.location}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-white">★</span>
                <span className="font-medium text-white">{trainer.rating}</span>
                <span className="text-silver-400">
                  ({trainer.reviewCount} reviews)
                </span>
              </div>
              <span className="text-silver-400">·</span>
              <span className="font-medium text-white">
                {formatPrice(trainer.pricePerSession)}
                <span className="font-normal text-silver-400"> / session</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
