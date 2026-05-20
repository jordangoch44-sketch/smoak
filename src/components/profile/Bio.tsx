import type { Trainer } from "@/types/trainer";

interface BioProps {
  trainer: Trainer;
}

export function Bio({ trainer }: BioProps) {
  return (
    <section>
      <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-silver-400">
        About
      </h2>
      <p className="mt-4 text-base leading-relaxed text-silver-200 lg:text-lg">
        {trainer.bio}
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {trainer.specialty.map((s) => (
          <span
            key={s}
            className="rounded-full border border-white/10 px-4 py-1.5 text-sm text-silver-300"
          >
            {s}
          </span>
        ))}
      </div>
    </section>
  );
}
