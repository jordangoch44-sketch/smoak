import { cn } from "@/lib/utils";

export type DashboardSectionIconId =
  | "inquiries"
  | "analytics"
  | "growth"
  | "rankings"
  | "completion"
  | "discovery";

interface DashboardSectionIconProps {
  id: DashboardSectionIconId;
  className?: string;
}

/** Compact accordion title icons for specialist Overview sections. */
export function DashboardSectionIcon({
  id,
  className,
}: DashboardSectionIconProps) {
  const props = {
    className: cn("dashboard-accordion__section-icon-svg", className),
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (id) {
    case "inquiries":
      return (
        <svg {...props}>
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H10l-4 3.5V16H6.5A2.5 2.5 0 0 1 4 13.5v-7Z" />
          <path d="M8 9h8M8 12h5" />
        </svg>
      );
    case "analytics":
      return (
        <svg {...props}>
          <path d="M4 19V10M10 19V5M16 19v-7M22 19H2" />
        </svg>
      );
    case "growth":
      return (
        <svg {...props}>
          <path d="M4 17 10 11l4 4 6-7" />
          <path d="M15 8h5v5" />
        </svg>
      );
    case "rankings":
      return (
        <svg {...props}>
          <path d="M7 20V11M12 20V5M17 20v-6" />
        </svg>
      );
    case "completion":
      return (
        <svg {...props}>
          <path d="M8 3.5h6L19 8.5V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 7 20V5A1.5 1.5 0 0 1 8.5 3.5H8Z" />
          <path d="M14 3.5V8.5h5" />
          <path d="M9.5 13h5M9.5 16.5h3" />
        </svg>
      );
    case "discovery":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 12 16.5 7.5" />
          <path d="M12 4.5V12H19" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="7" />
        </svg>
      );
  }
}
