import type { AnalyticsMetricIconId } from "@/types/specialist-analytics";
import { cn } from "@/lib/utils";

interface AnalyticsMetricIconProps {
  id: AnalyticsMetricIconId;
  className?: string;
}

const stroke = "currentColor";

export function AnalyticsMetricIcon({ id, className }: AnalyticsMetricIconProps) {
  const props = {
    className: cn("dashboard-metric-icon", className),
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (id) {
    case "visibility":
      return (
        <svg {...props}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case "pulse":
      return (
        <svg {...props}>
          <path d="M4 14v-4M8 16V8M12 14V6M16 16v-8M20 14V10" />
        </svg>
      );
    case "diamond":
      return (
        <svg {...props}>
          <path d="M12 3 20 9 12 21 4 9Z" />
        </svg>
      );
    case "lightning":
      return (
        <svg {...props}>
          <path d="M13 2 5 14h6l-1 8 8-12h-6l1-8Z" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...props}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3.5v3M16 3.5v3M4 10h16" />
        </svg>
      );
    case "crown":
      return (
        <svg {...props}>
          <path d="M4 18h16M6 14l2-8 4 4 4-4 2 8" />
        </svg>
      );
    case "ranking":
      return (
        <svg {...props}>
          <path d="M7 20V10M12 20V4M17 20v-6" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}
