import Link from "next/link";
import type { ReactNode } from "react";

interface DashboardListItemProps {
  title: string;
  subtitle?: string;
  meta?: string;
  href?: string;
  badge?: ReactNode;
}

export function DashboardListItem({
  title,
  subtitle,
  meta,
  href,
  badge,
}: DashboardListItemProps) {
  const content = (
    <>
      <div className="dashboard-list-item__main">
        <div className="dashboard-list-item__copy">
          <p className="dashboard-list-item__title">{title}</p>
          {subtitle ? (
            <p className="dashboard-list-item__subtitle">{subtitle}</p>
          ) : null}
        </div>
        {badge}
      </div>
      {meta ? <span className="dashboard-list-item__meta">{meta}</span> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="dashboard-list-item dashboard-list-item--link">
        {content}
      </Link>
    );
  }

  return <div className="dashboard-list-item">{content}</div>;
}
