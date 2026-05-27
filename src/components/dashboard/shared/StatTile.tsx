import { PremiumLockedValues } from "./PremiumLockedValues";
import { cn } from "@/lib/utils";

export interface StatTileProps {
  label: string;
  value: string;
  detail?: string;
  lockValues?: boolean;
  className?: string;
}

export function StatTile({
  label,
  value,
  detail,
  lockValues = false,
  className,
}: StatTileProps) {
  return (
    <div
      className={cn("dashboard-analytics-stat dashboard-stat-tile", className)}
    >
      <p className="dashboard-analytics-stat__label">{label}</p>
      <PremiumLockedValues locked={lockValues}>
        <p className="dashboard-analytics-stat__value">{value}</p>
        {detail ? <p className="dashboard-analytics-stat__detail">{detail}</p> : null}
      </PremiumLockedValues>
      {lockValues ? <div className="dashboard-stat-tile__lock-veil" aria-hidden /> : null}
    </div>
  );
}
