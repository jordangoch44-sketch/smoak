"use client";

import {
  SPECIALIST_TIER_CATEGORIES,
  tierCategoryPriceLabel,
  type SpecialistTierCategory,
} from "@/lib/admin-specialist-tier-groups";
import type { ProTrialConversion } from "@/lib/admin-specialist-trial-service";

interface AdminSpecialistsTierNavProps {
  activeCategory: SpecialistTierCategory;
  counts: Record<SpecialistTierCategory, number>;
  trialConversion?: ProTrialConversion | null;
  onSelect: (category: SpecialistTierCategory) => void;
}

export function AdminSpecialistsTierNav({
  activeCategory,
  counts,
  trialConversion,
  onSelect,
}: AdminSpecialistsTierNavProps) {
  return (
    <div
      className="admin-tier-nav"
      role="tablist"
      aria-label="Specialist billing tiers"
    >
      {SPECIALIST_TIER_CATEGORIES.map((category) => {
        const isActive = activeCategory === category.id;
        const count = counts[category.id];
        return (
          <button
            key={category.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`admin-tier-card${isActive ? " admin-tier-card--active" : ""}`}
            onClick={() => onSelect(category.id)}
          >
            <span className="admin-tier-card__count">{count}</span>
            <span className="admin-tier-card__label">{category.label}</span>
            <span className="admin-tier-card__tier">{category.tierLabel}</span>
            <span className="admin-tier-card__price">
              {category.id === "pro_trial" &&
              trialConversion &&
              trialConversion.startedCount > 0
                ? `${trialConversion.conversionPercent ?? 0}% to paid`
                : tierCategoryPriceLabel(category.id)}
            </span>
            {category.id === "pro_trial" &&
            trialConversion &&
            trialConversion.startedCount > 0 ? (
              <span className="admin-tier-card__conversion">
                {trialConversion.convertedCount} of{" "}
                {trialConversion.startedCount} converted
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
