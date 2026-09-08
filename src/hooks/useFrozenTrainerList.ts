"use client";

import { useRef } from "react";
import type { Trainer } from "@/types/trainer";

/**
 * Keep marketplace rail order after the first paint.
 * Catalog hydrate, geo, and shuffle otherwise remount cards under a finger.
 */
export function useFrozenTrainerList(trainers: Trainer[]): Trainer[] {
  const idsRef = useRef<string[] | null>(null);
  const prevRef = useRef<Trainer[]>(trainers);

  if (trainers.length === 0) {
    return trainers;
  }

  if (!idsRef.current) {
    idsRef.current = trainers.map((trainer) => trainer.id);
    prevRef.current = trainers;
    return trainers;
  }

  const byId = new Map(trainers.map((trainer) => [trainer.id, trainer]));
  const ids = idsRef.current;
  const prev = prevRef.current;
  const unchanged =
    prev.length === ids.length &&
    prev.every((trainer, index) => trainer === byId.get(ids[index] ?? ""));

  if (unchanged) return prev;

  const frozen: Trainer[] = [];
  for (const id of ids) {
    const next = byId.get(id);
    if (next) frozen.push(next);
  }
  const result = frozen.length > 0 ? frozen : trainers;
  prevRef.current = result;
  return result;
}
