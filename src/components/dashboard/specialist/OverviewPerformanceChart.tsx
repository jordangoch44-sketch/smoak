"use client";

import { useId, useState } from "react";
import type { AnalyticsDayPoint } from "@/lib/specialist-analytics-series";

interface OverviewPerformanceChartProps {
  points: AnalyticsDayPoint[];
  metricLabel: string;
}

function formatTick(value: number): string {
  if (value >= 1000) {
    const compact = value / 1000;
    return `${Number.isInteger(compact) ? compact : compact.toFixed(1)}k`;
  }
  return String(value);
}

function formatDay(key: string): string {
  const [, month, day] = key.split("-").map(Number);
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[(month ?? 1) - 1]} ${day}`;
}

/** Monotone curve through the real daily points. The path visits every point. */
function smoothLine(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  }
  const n = points.length;
  const delta: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    const dx = points[i + 1].x - points[i].x;
    delta.push(dx === 0 ? 0 : (points[i + 1].y - points[i].y) / dx);
  }
  const slope = new Array<number>(n);
  slope[0] = delta[0] ?? 0;
  slope[n - 1] = delta[n - 2] ?? 0;
  for (let i = 1; i < n - 1; i += 1) {
    const left = delta[i - 1] ?? 0;
    const right = delta[i] ?? 0;
    slope[i] = left === 0 || right === 0 || left * right < 0 ? 0 : (left + right) / 2;
  }
  for (let i = 0; i < n - 1; i += 1) {
    const step = delta[i] ?? 0;
    if (step === 0) {
      slope[i] = 0;
      slope[i + 1] = 0;
      continue;
    }
    const a = slope[i] / step;
    const b = slope[i + 1] / step;
    const hypot = a * a + b * b;
    if (hypot > 9) {
      const scale = 3 / Math.sqrt(hypot);
      slope[i] = scale * a * step;
      slope[i + 1] = scale * b * step;
    }
  }
  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const dx = (points[i + 1].x - points[i].x) / 3;
    const c1x = points[i].x + dx;
    const c1y = points[i].y + slope[i] * dx;
    const c2x = points[i + 1].x - dx;
    const c2y = points[i + 1].y - slope[i + 1] * dx;
    path += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${points[i + 1].x.toFixed(2)} ${points[i + 1].y.toFixed(2)}`;
  }
  return path;
}

export function OverviewPerformanceChart({
  points,
  metricLabel,
}: OverviewPerformanceChartProps) {
  const gradientId = useId().replace(/:/g, "");
  const [index, setIndex] = useState<number | null>(null);
  const width = 320;
  const height = 168;
  const pad = { top: 16, right: 8, bottom: 28, left: 28 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...points.map((point) => point.value));
  const ticks = [0, Math.round(max / 2), max].filter(
    (tick, tickIndex, all) => all.indexOf(tick) === tickIndex
  );
  const plotted = points.map((point, pointIndex) => {
    const x =
      points.length <= 1
        ? pad.left + innerW / 2
        : pad.left + (pointIndex / (points.length - 1)) * innerW;
    const y = pad.top + innerH - (point.value / max) * innerH;
    return { ...point, x, y };
  });
  const line = smoothLine(plotted);
  const area =
    plotted.length > 0
      ? `${line} L ${plotted[plotted.length - 1].x.toFixed(2)} ${(pad.top + innerH).toFixed(2)} L ${plotted[0].x.toFixed(2)} ${(pad.top + innerH).toFixed(2)} Z`
      : "";
  const selected = index != null ? plotted[index] : null;
  const labelStep = Math.max(1, Math.ceil(points.length / 4));

  function selectAt(clientX: number, bounds: DOMRect) {
    if (plotted.length === 0) return;
    const ratio = (clientX - bounds.left) / bounds.width;
    const next = Math.round(Math.min(1, Math.max(0, ratio)) * (plotted.length - 1));
    setIndex(next);
  }

  return (
    <div className="overview-chart__plot">
      <svg
        className="overview-chart__svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${metricLabel} by day`}
        tabIndex={0}
        onPointerDown={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          selectAt(event.clientX, bounds);
        }}
        onPointerMove={(event) => {
          if (event.pointerType !== "mouse" && event.buttons === 0) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          selectAt(event.clientX, bounds);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setIndex(null);
        }}
        onKeyDown={(event) => {
          if (plotted.length === 0) return;
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            setIndex((current) => Math.max(0, (current ?? plotted.length - 1) - 1));
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            setIndex((current) =>
              Math.min(plotted.length - 1, (current ?? plotted.length - 1) + 1)
            );
          }
        }}
      >
        <defs>
          <linearGradient id={`${gradientId}-stroke`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ff7a6a" />
            <stop offset="52%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#67e8f9" />
          </linearGradient>
          <linearGradient id={`${gradientId}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => {
          const y = pad.top + innerH - (tick / max) * innerH;
          return (
            <g key={tick}>
              <line
                className="overview-chart__grid"
                x1={pad.left}
                x2={width - pad.right}
                y1={y}
                y2={y}
              />
              <text className="overview-chart__tick" x={pad.left - 6} y={y + 3} textAnchor="end">
                {formatTick(tick)}
              </text>
            </g>
          );
        })}
        {plotted.map((point, pointIndex) =>
          pointIndex % labelStep === 0 ? (
            <line
              key={`v-${point.date}`}
              className="overview-chart__grid overview-chart__grid--v"
              x1={point.x}
              x2={point.x}
              y1={pad.top}
              y2={pad.top + innerH}
            />
          ) : null
        )}
        <line
          className="overview-chart__axis"
          x1={pad.left}
          x2={pad.left}
          y1={pad.top}
          y2={pad.top + innerH}
        />
        <line
          className="overview-chart__axis"
          x1={pad.left}
          x2={width - pad.right}
          y1={pad.top + innerH}
          y2={pad.top + innerH}
        />
        {area ? <path d={area} fill={`url(#${gradientId}-fill)`} /> : null}
        {line ? (
          <path
            d={line}
            fill="none"
            stroke={`url(#${gradientId}-stroke)`}
            strokeWidth="2.25"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        {plotted.map((point, pointIndex) =>
          pointIndex % labelStep === 0 || pointIndex === plotted.length - 1 ? (
            <text
              key={point.date}
              className="overview-chart__tick"
              x={point.x}
              y={height - 8}
              textAnchor="middle"
            >
              {formatDay(point.date)}
            </text>
          ) : null
        )}
        {selected ? (
          <g>
            <line
              className="overview-chart__guide"
              x1={selected.x}
              x2={selected.x}
              y1={pad.top}
              y2={pad.top + innerH}
            />
            <circle cx={selected.x} cy={selected.y} r="4.5" className="overview-chart__dot" />
          </g>
        ) : null}
      </svg>
      {selected ? (
        <p className="overview-chart__tip" role="status">
          <span>{formatDay(selected.date)}</span>
          <strong>
            {selected.value.toLocaleString()} {metricLabel.toLowerCase()}
          </strong>
        </p>
      ) : points.every((point) => point.value === 0) ? (
        <p className="overview-chart__hint">No activity in this period.</p>
      ) : (
        <p className="overview-chart__hint">Touch the chart to see a day’s exact count.</p>
      )}
    </div>
  );
}
