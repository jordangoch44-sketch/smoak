import { cn } from "@/lib/utils";

export type DashboardSectionIconId =
  | "inquiries"
  | "analytics"
  | "growth"
  | "completion"
  | "rankings"
  | "reviews";

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
    case "completion":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m8.5 12.2 2.4 2.4 4.6-5.2" />
        </svg>
      );
    case "rankings":
      return (
        <svg {...props}>
          <path d="M7 20V11M12 20V5M17 20v-6" />
        </svg>
      );
    case "reviews":
      return (
        <svg {...props}>
          <path d="m12 3.5 2.2 4.5 5 .7-3.6 3.5.9 5L12 14.9 7.5 17.2l.9-5L4.8 8.7l5-.7L12 3.5Z" />
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
