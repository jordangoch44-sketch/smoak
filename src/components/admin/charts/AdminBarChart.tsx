import type { AdminChartSegment } from "@/lib/admin-overview-charts";

interface AdminBarChartProps {
  title: string;
  segments: AdminChartSegment[];
  valueSuffix?: string;
}

export function AdminBarChart({
  title,
  segments,
  valueSuffix = "",
}: AdminBarChartProps) {
  const max = Math.max(...segments.map((s) => s.value), 1);

  return (
    <div className="admin-chart admin-chart--bar">
      <h4 className="admin-chart__title">{title}</h4>
      <ul className="admin-chart__bars" aria-label={title}>
        {segments.map((segment) => {
          const pct = segment.value > 0 ? (segment.value / max) * 100 : 0;
          return (
            <li key={segment.id} className="admin-chart__bar-row">
              <div className="admin-chart__bar-meta">
                <span className="admin-chart__bar-label">{segment.label}</span>
                <span className="admin-chart__bar-value">
                  {segment.value}
                  {valueSuffix}
                </span>
              </div>
              <div className="admin-chart__bar-track" aria-hidden>
                <span
                  className="admin-chart__bar-fill"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: segment.color,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
