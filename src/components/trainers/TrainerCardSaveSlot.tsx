"use client";

import { SaveTrainerButton } from "./SaveTrainerButton";

interface TrainerCardSaveSlotProps {
  trainerId: string;
}

/** Favorite control — always outside the card link, pinned top-right */
export function TrainerCardSaveSlot({ trainerId }: TrainerCardSaveSlotProps) {
  return (
    <div
      className="trainer-card-save"
      data-save-control
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <SaveTrainerButton trainerId={trainerId} overlay={false} />
    </div>
  );
}
