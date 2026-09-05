import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import { cn } from "@/lib/utils";
import type { Trainer } from "@/types";

interface TrainerProfessionLabelProps {
  trainer: Pick<Trainer, "profession" | "title" | "specialty">;
  className?: string;
  as?: "p" | "span";
}

/** Category under the name — Personal Training, etc. Hidden when unknown. */
export function TrainerProfessionLabel({
  trainer,
  className,
  as: Tag = "p",
}: TrainerProfessionLabelProps) {
  const label = resolveTrainerProfessionCategory(trainer);
  if (!label) return null;
  return <Tag className={cn(className)}>{label}</Tag>;
}
