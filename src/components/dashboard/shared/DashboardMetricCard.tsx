import { PremiumLockedValues } from "./PremiumLockedValues";

interface DashboardMetricCardProps {
  label: string;
  value: string;
  detail?: string;
  progress?: number;
  lockValues?: boolean;
}

export function DashboardMetricCard({
  label,
  value,
  detail,
  progress,
  lockValues = false,
}: DashboardMetricCardProps) {
  return (
    <div className="dashboard-metric">
      <p className="dashboard-metric__label">{label}</p>
      <PremiumLockedValues locked={lockValues}>
        <p className="dashboard-metric__value">{value}</p>
        {detail ? <p className="dashboard-metric__detail">{detail}</p> : null}
        {typeof progress === "number" ? (
          <div className="dashboard-metric__progress" aria-hidden>
            <span
              className="dashboard-metric__progress-fill"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        ) : null}
      </PremiumLockedValues>
    </div>
  );
}
