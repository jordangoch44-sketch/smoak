import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface DashboardSectionProps {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  span?: "full";
  children: ReactNode;
  className?: string;
}

export function DashboardSection({
  title,
  description,
  href,
  linkLabel = "View all",
  span,
  children,
  className,
}: DashboardSectionProps) {
  return (
    <section
      className={cn(
        "dashboard-section dashboard-glass",
        span === "full" && "dashboard-grid__span-2",
        className
      )}
    >
      <div className="dashboard-section__head">
        <div>
          <h2 className="dashboard-section__title">{title}</h2>
          {description ? (
            <p className="dashboard-section__desc">{description}</p>
          ) : null}
        </div>
        {href ? (
          <Link href={href} className="dashboard-section__link">
            {linkLabel}
          </Link>
        ) : null}
      </div>
      <div className="dashboard-section__body">{children}</div>
    </section>
  );
}
