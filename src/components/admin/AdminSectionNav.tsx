"use client";

import { ADMIN_SECTIONS, type AdminSectionId } from "@/lib/admin-sections";
import { cn } from "@/lib/utils";

export { ADMIN_SECTIONS, type AdminSectionId };

interface AdminSectionNavProps {
  activeId: AdminSectionId;
  allowedSectionIds: readonly AdminSectionId[];
  badgeCounts?: Partial<Record<AdminSectionId, number>>;
  onSelect: (id: AdminSectionId) => void;
}

function formatBadgeCount(count: number): string {
  if (count > 99) return "99+";
  return String(count);
}

export function AdminSectionNav({
  activeId,
  allowedSectionIds,
  badgeCounts,
  onSelect,
}: AdminSectionNavProps) {
  const sections = ADMIN_SECTIONS.filter((section) =>
    allowedSectionIds.includes(section.id)
  );

  return (
    <nav className="admin-nav" aria-label="Admin sections">
      <div className="admin-nav__scroll">
        {sections.map((section) => {
          const badgeCount = badgeCounts?.[section.id] ?? 0;
          const showBadge = badgeCount > 0;
          const isActive = activeId === section.id;

          return (
            <button
              key={section.id}
              type="button"
              id={`admin-tab-${section.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`admin-panel-${section.id}`}
              className={cn(
                "admin-nav__link",
                isActive && "admin-nav__link--active",
                showBadge && "admin-nav__link--has-badge"
              )}
              onClick={() => onSelect(section.id)}
            >
              <span className="admin-nav__label">{section.label}</span>
              {showBadge ? (
                <span
                  className="admin-nav__badge"
                  aria-label={`${badgeCount} need attention`}
                >
                  {formatBadgeCount(badgeCount)}
                </span>
              ) : null}
              {isActive ? (
                <span className="admin-nav__indicator" aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
