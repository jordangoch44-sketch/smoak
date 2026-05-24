import type { Trainer } from "@/types";
import { cn } from "@/lib/utils";
import { TrainerCard } from "./TrainerCard";

/** Shared list layout: compact horizontal cards below md, vertical grid at md+ (same as Explore). */
const listLayouts = {
  explore: "flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-6 xl:grid-cols-3",
  featured: "flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-6 lg:grid-cols-4",
} as const;

interface TrainerListProps {
  trainers: Trainer[];
  variant?: keyof typeof listLayouts;
  priorityCount?: number;
  className?: string;
}

export function TrainerList({
  trainers,
  variant = "explore",
  priorityCount = 4,
  className,
}: TrainerListProps) {
  return (
    <div className={cn(listLayouts[variant], className)}>
      {trainers.map((trainer, index) => (
        <TrainerCard
          key={trainer.id}
          trainer={trainer}
          priority={index < priorityCount}
        />
      ))}
    </div>
  );
}
