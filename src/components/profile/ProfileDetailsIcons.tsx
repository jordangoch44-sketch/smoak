import type { ComponentType } from "react";
import {
  AppleFruitIcon,
  BoxingGloveIcon,
  DumbbellIcon,
  LayoutGridIcon,
  LocationMarkIcon,
  MeditationIcon,
  MedicalCrossIcon,
  RunningFigureIcon,
  TravelRangeIcon,
  TrophyIcon,
  UserIcon,
  UsersIcon,
} from "@/components/ui/icons";
import type {
  ProfileSpecialtyIconId,
  TrainingOptionKind,
} from "@/lib/profile-details-visual";

interface GlyphProps {
  className?: string;
}

export function FlameGlyph({ className = "h-4 w-4" }: GlyphProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.868 8.21 8.21 0 003 2.481z"
      />
      <path
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18a3.75 3.75 0 00.495-7.468 5.25 5.25 0 00-1.32-2.214 3.75 3.75 0 01.825 9.682z"
      />
    </svg>
  );
}

export function BoltGlyph({ className = "h-4 w-4" }: GlyphProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
      />
    </svg>
  );
}

export function HexGlyph({ className = "h-4 w-4" }: GlyphProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        d="M12 3.2 19.5 7.6v8.8L12 20.8 4.5 16.4V7.6L12 3.2z"
      />
    </svg>
  );
}

export function CarGlyph({ className = "h-4 w-4" }: GlyphProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 13.5 5.4 8.7A1.5 1.5 0 016.8 7.5h10.4a1.5 1.5 0 011.4 1.2l1.65 4.8M3.75 13.5h16.5M3.75 13.5v3.75A1.5 1.5 0 005.25 18.75h.75M20.25 13.5v3.75a1.5 1.5 0 01-1.5 1.5h-.75M6 16.5a1.125 1.125 0 11-2.25 0A1.125 1.125 0 016 16.5zm14.25 0a1.125 1.125 0 11-2.25 0 1.125 1.125 0 012.25 0z"
      />
    </svg>
  );
}

const SPECIALTY_ICONS: Record<
  ProfileSpecialtyIconId,
  ComponentType<{ className?: string }>
> = {
  flame: FlameGlyph,
  dumbbell: DumbbellIcon,
  bolt: BoltGlyph,
  run: RunningFigureIcon,
  hex: HexGlyph,
  apple: AppleFruitIcon,
  yoga: MeditationIcon,
  glove: BoxingGloveIcon,
  medical: MedicalCrossIcon,
  trophy: TrophyIcon,
};

export function ProfileSpecialtyIcon({
  id,
  className,
}: {
  id: ProfileSpecialtyIconId;
  className?: string;
}) {
  const Icon = SPECIALTY_ICONS[id] ?? DumbbellIcon;
  return <Icon className={className} />;
}

const TRAINING_ICONS: Record<
  TrainingOptionKind,
  ComponentType<{ className?: string }>
> = {
  "one-on-one": UserIcon,
  "semi-private": UsersIcon,
  class: LayoutGridIcon,
};

export function ProfileTrainingKindIcon({
  kind,
  className,
}: {
  kind: TrainingOptionKind;
  className?: string;
}) {
  const Icon = TRAINING_ICONS[kind] ?? DumbbellIcon;
  return <Icon className={className} />;
}

export function ProfileLocationFactIcon({
  kind,
  className,
}: {
  kind: "place" | "travel" | "radius";
  className?: string;
}) {
  if (kind === "travel") return <CarGlyph className={className} />;
  if (kind === "radius") return <TravelRangeIcon className={className} />;
  return <LocationMarkIcon className={className} />;
}
