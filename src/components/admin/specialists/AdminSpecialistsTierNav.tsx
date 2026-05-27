"use client";

import {
  SPECIALIST_TIER_CATEGORIES,
  tierCategoryPriceLabel,
  type SpecialistTierCategory,
} from "@/lib/admin-specialist-tier-groups";

interface AdminSpecialistsTierNavProps {
  activeCategory: SpecialistTierCategory;
  counts: Record<SpecialistTierCategory, number>;
  onSelect: (category: SpecialistTierCategory) => void;
}

export function AdminSpecialistsTierNav({
  activeCategory,
  counts,
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
              {tierCategoryPriceLabel(category.id)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
