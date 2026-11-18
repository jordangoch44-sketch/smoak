"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { cn } from "@/lib/utils";

export type ProfileSheetTabId =
  | "overview"
  | "services"
  | "results"
  | "reviews"
  | "faqs";

const TABS: {
  id: ProfileSheetTabId;
  label: string;
  ariaLabel: string;
}[] = [
  { id: "overview", label: "Overview", ariaLabel: "Overview" },
  { id: "services", label: "Services", ariaLabel: "Services" },
  { id: "results", label: "Results", ariaLabel: "Results" },
  { id: "reviews", label: "Reviews", ariaLabel: "Reviews" },
  { id: "faqs", label: "FAQs", ariaLabel: "FAQs" },
];

interface ProfileSheetTabsProps {
  value: ProfileSheetTabId;
  onChange: (id: ProfileSheetTabId) => void;
  overview: ReactNode;
  services?: ReactNode;
  results?: ReactNode;
  reviews?: ReactNode;
}

export function ProfileSheetTabs({
  value,
  onChange,
  overview,
  services = null,
  results = null,
  reviews = null,
}: ProfileSheetTabsProps) {
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ x: number; width: number } | null>(
    null
  );
  const [indicatorReady, setIndicatorReady] = useState(false);
  const panels: Record<ProfileSheetTabId, ReactNode> = {
    overview,
    services,
    results,
    reviews,
    faqs: null,
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

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const measure = () => {
      const active = list.querySelector<HTMLElement>(
        '[role="tab"][aria-selected="true"]'
      );
      if (!active) return;
      setIndicator({ x: active.offsetLeft, width: active.offsetWidth });
      setIndicatorReady(true);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div className="profile-sheet-tabs">
      <div
        ref={listRef}
        className="profile-sheet-tabs__list"
        role="tablist"
        aria-label="Specialist profile sections"
      >
        {indicator ? (
          <span
            className={cn(
              "profile-sheet-tabs__indicator",
              indicatorReady && "profile-sheet-tabs__indicator--ready"
            )}
            style={{
              width: indicator.width,
              transform: `translate3d(${indicator.x}px, 0, 0)`,
            }}
            aria-hidden
          />
        ) : null}
        {TABS.map((tab) => {
          const selected = value === tab.id;
          return (
            <FastActivateButton
              key={tab.id}
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
              onActivate={() => onChange(tab.id)}
              onKeyDown={onTabKeyDown}
            >
              {tab.label}
            </FastActivateButton>
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
