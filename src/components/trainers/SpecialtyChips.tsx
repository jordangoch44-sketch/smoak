import {
  DEFAULT_VISIBLE_SPECIALTIES,
  getVisibleSpecialties,
} from "@/lib/specialty-display";
import { cn } from "@/lib/utils";

interface SpecialtyChipsProps {
  specialties: readonly string[] | null | undefined;
  maxVisible?: number;
  className?: string;
  /** Accessible label for the chips group */
  "aria-label"?: string;
}

/**
 * Up to `maxVisible` full specialty names, plus a compact “+X” overflow chip.
 * Hides entirely when there are no specialties.
 */
export function SpecialtyChips({
  specialties,
  maxVisible = DEFAULT_VISIBLE_SPECIALTIES,
  className,
  "aria-label": ariaLabel = "Specialties",
}: SpecialtyChipsProps) {
  const { visible, extraCount } = getVisibleSpecialties(specialties, maxVisible);
  if (visible.length === 0) return null;

  return (
    <ul className={cn("specialty-chips", className)} aria-label={ariaLabel}>
      {visible.map((tag) => (
        <li key={tag} className="specialty-chips__chip">
          {tag}
        </li>
      ))}
      {extraCount > 0 ? (
        <li className="specialty-chips__more" aria-label={`${extraCount} more specialties`}>
          +{extraCount}
        </li>
      ) : null}
    </ul>
  );
}
