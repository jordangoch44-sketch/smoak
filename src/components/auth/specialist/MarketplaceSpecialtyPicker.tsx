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
  const pillClass = variant === "wizard" ? "wizard-pill" : "dashboard-edit-chip";
  const activeClass =
    variant === "wizard"
      ? "wizard-pill--active"
      : "dashboard-edit-chip--active";
  const featuredClass =
    variant === "wizard"
      ? "wizard-pill--card-featured"
      : "dashboard-edit-chip--card-featured";

  return (
    <>
      <p
        className={
          variant === "wizard" ? "wizard-field-hint" : "dashboard-edit-hint"
        }
      >
        Tap to add a specialty. Double-tap to make it one of your top{" "}
        {HOMEPAGE_FEATURED_SPECIALTY_LIMIT} displayed on the marketplace card.
        Tap a third time to remove it.
      </p>
      <div
        className={
          variant === "wizard"
            ? "wizard-pill-grid wizard-pill-grid--wide"
            : "dashboard-edit-chip-grid"
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
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              aria-label={
                onCard
                  ? `${option} (on your marketplace card)`
                  : active
                    ? option
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
          );
        })}
      </div>
    </>
  );
}
