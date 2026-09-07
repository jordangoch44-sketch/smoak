"use client";

import { HomeBoostCard } from "@/components/home/HomeBoostCard";

interface BoostProfileCardProps {
  onOpenBoost: () => void;
}

export function BoostProfileCard({ onOpenBoost }: BoostProfileCardProps) {
  return (
    <HomeBoostCard
      className="home-boost-card--dashboard"
      onClick={onOpenBoost}
    />
  );
}
