import type { AdminChartSegment } from "@/lib/admin-overview-charts";

interface AdminDonutChartProps {
  title: string;
  segments: AdminChartSegment[];
  centerLabel?: string;
  valuePrefix?: string;
}

export function AdminDonutChart({
  title,
  segments,
  centerLabel,
  valuePrefix = "",
}: AdminDonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  const rings = segments.reduce<
    Array<{ segment: AdminChartSegment; dash: number; offset: number }>
  >((acc, segment) => {
    const fraction = segment.value / total;
    const dash = fraction * circumference;
    const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
    acc.push({ segment, dash, offset });
    return acc;
  }, []);

  return (
    <div className="admin-chart admin-chart--donut">
      <h4 className="admin-chart__title">{title}</h4>
      <div className="admin-chart__donut-wrap">
        <svg
          className="admin-chart__donut-svg"
          viewBox="0 0 100 100"
          role="img"
          aria-label={title}
        >
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="12"
          />
          {rings.map(({ segment, dash, offset }) => (
            <circle
              key={segment.id}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth="12"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 50 50)"
              strokeLinecap="round"
            />
          ))}
        </svg>
        {centerLabel ? (
          <div className="admin-chart__donut-center">
            <span className="admin-chart__donut-center-value">
              {valuePrefix}
              {total}
            </span>
            <span className="admin-chart__donut-center-label">{centerLabel}</span>
          </div>
        ) : null}
      </div>
      <ul className="admin-chart__legend">
        {segments.map((segment) => (
          <li key={segment.id} className="admin-chart__legend-item">
            <span
              className="admin-chart__legend-swatch"
              style={{ backgroundColor: segment.color }}
              aria-hidden
            />
            <span className="admin-chart__legend-label">{segment.label}</span>
            <span className="admin-chart__legend-value">{segment.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
