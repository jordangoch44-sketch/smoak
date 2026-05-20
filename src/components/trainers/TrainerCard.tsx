import Image from "next/image";
import Link from "next/link";
import type { Trainer } from "@/types/trainer";
import { formatPrice } from "@/lib/utils";

interface TrainerCardProps {
  trainer: Trainer;
}

export function TrainerCard({ trainer }: TrainerCardProps) {
  return (
    <Link
      href={`/trainers/${trainer.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-graphite-900 transition-all duration-300 hover:border-white/10 hover:bg-graphite-800"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <Image
          src={trainer.image}
          alt={trainer.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-1 text-sm text-silver-200">
            <span className="text-white">★</span>
            <span className="font-medium text-white">{trainer.rating}</span>
            <span className="text-silver-400">({trainer.reviewCount})</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-medium tracking-tight text-white group-hover:text-accent">
          {trainer.name}
        </h3>
        <p className="mt-1 text-sm text-silver-400">{trainer.title}</p>
        <p className="mt-2 text-xs text-silver-400">{trainer.location}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {trainer.specialty.slice(0, 2).map((s) => (
            <span
              key={s}
              className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-silver-300"
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
    </Link>
  );
}
