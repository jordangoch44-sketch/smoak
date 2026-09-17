"use client";

import { marketplaceSpecialtyOptions } from "@/data/marketplace-specialties";
import {
  HOMEPAGE_FEATURED_SPECIALTY_LIMIT,
  orderSpecialtyPickerOptions,
  sanitizeHomepageSpecialties,
  sanitizeMarketplaceSpecialties,
  toggleMarketplaceSpecialty,
} from "@/lib/specialty-display";
import { cn } from "@/lib/utils";

export function MarketplaceSpecialtyPicker({
  selected,
  homepageSpecialties,
  onChange,
  variant = "dashboard",
  required = false,
}: {
  selected: readonly string[];
  homepageSpecialties?: readonly string[] | null;
  onChange: (next: {
    specialty: string[];
    homepageSpecialties: string[];
  }) => void;
  variant?: "dashboard" | "wizard";
  required?: boolean;
}) {
  const specialty = sanitizeMarketplaceSpecialties(selected);
  const featured = sanitizeHomepageSpecialties(specialty, homepageSpecialties);
  const featuredSet = new Set(featured);
  const isWizard = variant === "wizard";
  const pillClass = isWizard ? "wizard-pill" : "dashboard-edit-chip";
  const activeClass = isWizard
    ? "wizard-pill--active"
    : "dashboard-edit-chip--active";
  const featuredClass = isWizard
    ? "wizard-pill--card-featured"
    : "dashboard-edit-chip--card-featured";

  return (
    <div className="specialty-picker">
      <p className={isWizard ? "wizard-field-hint" : "dashboard-edit-hint"}>
        {isWizard
          ? "Select 1 or more specialties."
          : "Select 1 or more. Tap a selected specialty again to pin it as a Top specialty on your marketplace card."}
      </p>
      <div
        className={
          isWizard
            ? "wizard-pill-grid wizard-pill-grid--wide specialty-picker__grid"
            : "dashboard-edit-chip-grid specialty-picker__grid"
        }
        role="group"
        aria-label="Specialties"
        aria-required={required || undefined}
      >
        {orderSpecialtyPickerOptions(
          marketplaceSpecialtyOptions,
          specialty,
          HOMEPAGE_FEATURED_SPECIALTY_LIMIT,
          homepageSpecialties
        ).map((option) => {
          const active = specialty.includes(option);
          const onCard = featuredSet.has(option);
          const hint = onCard
            ? "Top specialty"
            : active
              ? "Tap again to pin"
              : null;
          return (
            <div
              key={option}
              className={cn(
                "specialty-picker-option",
                active && "specialty-picker-option--selected",
                onCard && "specialty-picker-option--pinned"
              )}
            >
              <button
                type="button"
                aria-pressed={active}
                aria-label={
                  onCard
                    ? `${option}, Top specialty. Tap to remove.`
                    : active
                      ? `${option}. Tap again to pin as a Top specialty.`
                      : `Add ${option}`
                }
                onClick={() =>
                  onChange(
                    toggleMarketplaceSpecialty(
                      option,
                      specialty,
                      homepageSpecialties
                    )
                  )
                }
                className={cn(
                  pillClass,
                  active && activeClass,
                  onCard && featuredClass
                )}
              >
                {option}
              </button>
              {hint ? (
                <span
                  className={cn(
                    "specialty-picker-option__hint",
                    onCard && "specialty-picker-option__hint--pinned"
                  )}
                  aria-hidden
                >
                  {hint}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
