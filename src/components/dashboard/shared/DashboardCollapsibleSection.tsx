"use client";

import {
  useId,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface DashboardCollapsibleSectionProps {
  title: string;
  description?: string;
  /** Short meta shown on the closed row (e.g. “#4 · Mira Mesa”) */
  summary?: ReactNode;
  /** Small icon on the right of the title (before chevron) */
  icon?: ReactNode;
  href?: string;
  linkLabel?: string;
  defaultOpen?: boolean;
  /** Controlled open state — when set, ignores internal toggle state */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  span?: "full";
  className?: string;
  children: ReactNode;
}

export function DashboardCollapsibleSection({
  title,
  description,
  summary,
  icon,
  href,
  linkLabel = "View all",
  defaultOpen = false,
  open: openControlled,
  onOpenChange,
  span,
  className,
  children,
}: DashboardCollapsibleSectionProps) {
  const panelId = useId();
  const [openUncontrolled, setOpenUncontrolled] = useState(defaultOpen);
  const open = openControlled ?? openUncontrolled;

  function setOpen(next: boolean) {
    if (openControlled === undefined) setOpenUncontrolled(next);
    onOpenChange?.(next);
  }

  return (
    <section
      className={cn(
        "dashboard-section dashboard-glass dashboard-accordion",
        open && "dashboard-accordion--open",
        span === "full" && "dashboard-grid__span-2",
        className
      )}
    >
      <div className="dashboard-accordion__head">
        <button
          type="button"
          className="smoac-control dashboard-accordion__trigger"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
        >
          <span className="dashboard-accordion__trigger-copy">
            <span className="dashboard-accordion__title-row">
              <span className="dashboard-section__title">{title}</span>
              {icon ? (
                <span className="dashboard-accordion__section-icon" aria-hidden>
                  {icon}
                </span>
              ) : null}
            </span>
            {description ? (
              <span className="dashboard-section__desc">{description}</span>
            ) : null}
            {!open && summary ? (
              <span className="dashboard-accordion__summary">{summary}</span>
            ) : null}
          </span>
          <span
            className={cn(
              "dashboard-accordion__chevron",
              open && "dashboard-accordion__chevron--open"
            )}
            aria-hidden
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
        {href ? (
          <Link
            href={href}
            className="dashboard-section__link dashboard-accordion__link"
            onClick={(event) => event.stopPropagation()}
          >
            {linkLabel}
          </Link>
        ) : null}
      </div>

      <div
        id={panelId}
        className={cn(
          "dashboard-accordion__panel",
          open && "dashboard-accordion__panel--open"
        )}
        hidden={!open}
      >
        <div className="dashboard-section__body dashboard-accordion__body">
          {children}
        </div>
      </div>
    </section>
  );
}
