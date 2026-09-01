import type { CalorieProjectionPoint } from "@/lib/tools/calorie-calculator";

interface CalorieProjectionChartProps {
  points: readonly CalorieProjectionPoint[];
  weeklyChangeLb: number;
}

const VIEW_W = 360;
const VIEW_H = 220;
const PAD = { top: 18, right: 16, bottom: 36, left: 44 };

function niceWeightBounds(weights: number[]): { min: number; max: number } {
  const rawMin = Math.min(...weights);
  const rawMax = Math.max(...weights);
  const span = Math.max(rawMax - rawMin, 2);
  const pad = span * 0.18;
  const min = Math.floor(rawMin - pad);
  const max = Math.ceil(rawMax + pad);
  return { min, max: Math.max(max, min + 2) };
}

/** SVG line chart — weeks on X, weight (lb) on Y. */
export function CalorieProjectionChart({
  points,
  weeklyChangeLb,
}: CalorieProjectionChartProps) {
  if (points.length < 2) return null;

  const weeks = points.map((p) => p.week);
  const weights = points.map((p) => p.weightLb);
  const minWeek = Math.min(...weeks);
  const maxWeek = Math.max(...weeks);
  const { min: minWeight, max: maxWeight } = niceWeightBounds(weights);

  const plotW = VIEW_W - PAD.left - PAD.right;
  const plotH = VIEW_H - PAD.top - PAD.bottom;

  function xFor(week: number): number {
    if (maxWeek === minWeek) return PAD.left + plotW / 2;
    return PAD.left + ((week - minWeek) / (maxWeek - minWeek)) * plotW;
  }

  function yFor(weight: number): number {
    return (
      PAD.top + ((maxWeight - weight) / (maxWeight - minWeight)) * plotH
    );
  }

  const linePath = points
    .map((point, index) => {
      const x = xFor(point.week);
      const y = yFor(point.weightLb);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const areaPath = `${linePath} L${xFor(points[points.length - 1]!.week).toFixed(1)} ${(PAD.top + plotH).toFixed(1)} L${xFor(points[0]!.week).toFixed(1)} ${(PAD.top + plotH).toFixed(1)} Z`;

  const yTicks = [minWeight, (minWeight + maxWeight) / 2, maxWeight].map(
    (value) => Math.round(value * 10) / 10
  );
  const xTicks = [0, 3, 6, 9, 12].filter(
    (week) => week >= minWeek && week <= maxWeek
  );

  const trendLabel =
    weeklyChangeLb < 0
      ? "Weight over time"
      : weeklyChangeLb > 0
        ? "Weight over time"
        : "Weight held steady";

  return (
    <figure className="calorie-tool__chart">
      <svg
        className="calorie-tool__chart-svg"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={`${trendLabel}. Estimated weight from week ${minWeek} to week ${maxWeek}.`}
      >
        <defs>
          <linearGradient id="calorie-chart-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff6b4a" />
            <stop offset="35%" stopColor="#f472b6" />
            <stop offset="60%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#7dd3fc" />
          </linearGradient>
          <linearGradient id="calorie-chart-fill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(168, 85, 247, 0.28)" />
            <stop offset="100%" stopColor="rgba(168, 85, 247, 0)" />
          </linearGradient>
        </defs>

        {/* Plot frame */}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={plotW}
          height={plotH}
          fill="rgba(255,255,255,0.02)"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
          rx="8"
        />

        {/* Y grid + labels */}
        {yTicks.map((tick) => {
          const y = yFor(tick);
          return (
            <g key={`y-${tick}`}>
              <line
                x1={PAD.left}
                y1={y}
                x2={PAD.left + plotW}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={y + 3}
                textAnchor="end"
                className="calorie-tool__chart-tick"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* X ticks */}
        {xTicks.map((week) => {
          const x = xFor(week);
          return (
            <g key={`x-${week}`}>
              <line
                x1={x}
                y1={PAD.top + plotH}
                x2={x}
                y2={PAD.top + plotH + 4}
                stroke="rgba(255,255,255,0.28)"
                strokeWidth="1"
              />
              <text
                x={x}
                y={PAD.top + plotH + 18}
                textAnchor="middle"
                className="calorie-tool__chart-tick"
              >
                {week === 0 ? "Now" : `W${week}`}
              </text>
            </g>
          );
        })}

        {/* Axis titles */}
        <text
          x={PAD.left + plotW / 2}
          y={VIEW_H - 4}
          textAnchor="middle"
          className="calorie-tool__chart-axis"
        >
          Time (weeks)
        </text>
        <text
          x={14}
          y={PAD.top + plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90 14 ${PAD.top + plotH / 2})`}
          className="calorie-tool__chart-axis"
        >
          Weight (lb)
        </text>

        <path d={areaPath} fill="url(#calorie-chart-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke="url(#calorie-chart-line)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points
          .filter((_, index) => index % 2 === 0 || index === points.length - 1)
          .map((point) => (
            <circle
              key={point.week}
              cx={xFor(point.week)}
              cy={yFor(point.weightLb)}
              r="3.5"
              fill="#0c0c0e"
              stroke="url(#calorie-chart-line)"
              strokeWidth="2"
            />
          ))}
      </svg>
    </figure>
  );
}
