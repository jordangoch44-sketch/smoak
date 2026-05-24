import Link from "next/link";

interface DashboardEmptyStateProps {
  message: string;
  actionHref?: string;
  actionLabel?: string;
}

export function DashboardEmptyState({
  message,
  actionHref,
  actionLabel,
}: DashboardEmptyStateProps) {
  return (
    <div className="dashboard-empty">
      <p className="dashboard-empty__text">{message}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="dashboard-empty__link">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
