export interface StatTileProps {
  label: string;
  value: string;
  detail?: string;
}

export function StatTile({ label, value, detail }: StatTileProps) {
  return (
    <div className="dashboard-analytics-stat dashboard-stat-tile">
      <p className="dashboard-analytics-stat__label">{label}</p>
      <p className="dashboard-analytics-stat__value">{value}</p>
      {detail ? <p className="dashboard-analytics-stat__detail">{detail}</p> : null}
    </div>
  );
}
