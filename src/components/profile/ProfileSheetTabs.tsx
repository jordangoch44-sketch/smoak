"use client";

import { useId, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ProfileSheetTabId = "details" | "reviews" | "inquire";

const TABS: {
  id: ProfileSheetTabId;
  label: string;
  ariaLabel: string;
}[] = [
  { id: "details", label: "Details", ariaLabel: "Full profile details" },
  { id: "reviews", label: "Reviews", ariaLabel: "Reviews" },
  { id: "inquire", label: "Inquire", ariaLabel: "Questions and inquire" },
];

interface ProfileSheetTabsProps {
  value: ProfileSheetTabId;
  onChange: (id: ProfileSheetTabId) => void;
  details: ReactNode;
  reviews: ReactNode;
  inquire: ReactNode;
}

export function ProfileSheetTabs({
  value,
  onChange,
  details,
  reviews,
  inquire,
}: ProfileSheetTabsProps) {
  const baseId = useId();
  const panels: Record<ProfileSheetTabId, ReactNode> = {
    details,
    reviews,
    inquire,
  };

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const current = TABS.findIndex((tab) => tab.id === value);
    if (current < 0) return;

    let next = current;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (current + 1) % TABS.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (current - 1 + TABS.length) % TABS.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = TABS.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    onChange(TABS[next].id);
    const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]'
    );
    buttons?.[next]?.focus();
  }

  return (
    <div className="profile-sheet-tabs">
      <div
        className="profile-sheet-tabs__list"
        role="tablist"
        aria-label="Specialist profile sections"
      >
        {TABS.map((tab) => {
          const selected = value === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              className={cn(
                "smoac-control profile-sheet-tabs__btn",
                selected && "profile-sheet-tabs__btn--active"
              )}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              aria-label={tab.ariaLabel}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={onTabKeyDown}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {TABS.map((tab) => (
        <div
          key={tab.id}
          id={`${baseId}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={value !== tab.id}
          className="profile-sheet-tabs__panel"
        >
          {panels[tab.id]}
        </div>
      ))}
    </div>
  );
}
