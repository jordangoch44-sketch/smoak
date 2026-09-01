interface IconProps {
  className?: string;
}

export function SearchIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

export function ShieldCheckIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

export function FilterIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9 6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5"
      />
    </svg>
  );
}

export function HeartIcon({
  className = "h-5 w-5",
  filled = false,
}: IconProps & { filled?: boolean }) {
  if (filled) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <path d="M11.997 20.908l-.844-.468C6.33 16.588 3 13.328 3 9.75 3 6.364 5.364 4 8.75 4c1.77 0 3.465.92 4.247 2.388l.003.006.003-.006C13.785 4.92 15.48 4 17.25 4 20.636 4 23 6.364 23 9.75c0 3.578-3.33 6.838-8.153 10.69l-.844.468-.006.003-.006-.003z" />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  );
}

export function UserPlusIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z"
      />
    </svg>
  );
}

export function UserIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 19.125a7.125 7.125 0 0115 0v.375a.75.75 0 01-.75.75h-13.5a.75.75 0 01-.75-.75v-.375z"
      />
    </svg>
  );
}

export function HomeIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  );
}

export function UsersIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

export function TrophyIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0V7.5a3 3 0 00-3-3h-3a3 3 0 00-3 3v11.25m9 0H7.5"
      />
    </svg>
  );
}

export function CalendarIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M4.5 8.25h15M4.5 19.5A2.25 2.25 0 006.75 21.75h10.5A2.25 2.25 0 0019.5 19.5V8.25H4.5v11.25z"
      />
    </svg>
  );
}

export function LayoutGridIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  );
}

/** Travel radius — profile service area */
export function TravelRangeIcon({ className = "h-[18px] w-[18px]" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 3.75v2.25M12 18v2.25M3.75 12h2.25M18 12h2.25" />
      <circle cx="12" cy="12" r="2.25" />
    </svg>
  );
}

/** In-person sessions — profile service area */
export function InPersonFormatIcon({ className = "h-[18px] w-[18px]" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3.75 9.75h16.5M5.25 19.5h13.5M7.5 6.75V4.5a1.5 1.5 0 013 0v2.25M13.5 6.75V4.5a1.5 1.5 0 013 0v2.25M6 12.75h12v6.75H6V12.75z" />
    </svg>
  );
}

/** Virtual sessions — profile service area */
export function VirtualFormatIcon({ className = "h-[18px] w-[18px]" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3.75" y="5.25" width="16.5" height="11.25" rx="1.5" />
      <path d="M8.25 19.5h7.5" />
    </svg>
  );
}

/** Hybrid delivery — profile service area */
export function HybridFormatIcon({ className = "h-[18px] w-[18px]" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8.25 6.75h7.5M8.25 12h7.5M8.25 17.25h7.5M5.25 4.5h13.5v15H5.25V4.5z" />
    </svg>
  );
}

/** Minimal luxury location mark for the header selector */
export function LocationMarkIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="10.25"
        r="2.35"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <path
        d="M12 21.25s6.75-5.15 6.75-9.35a6.75 6.75 0 10-13.5 0c0 4.2 6.75 9.35 6.75 9.35z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CloseIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

export function InfoIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
      />
    </svg>
  );
}

export function HelpCircleIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
      />
    </svg>
  );
}

export function LogOutIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
      />
    </svg>
  );
}

export function EyeIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

export function ChartIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  );
}

export function MessageBubbleIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
      />
    </svg>
  );
}

/** Explore browse category — Personal Trainer */
export function DumbbellIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 8.5v7M18 8.5v7M3.75 10v4M20.25 10v4M6 12h12" />
    </svg>
  );
}

/** Homepage / Explore browse — Nutrition (apple) */
export function AppleFruitIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 6.5c.4-1.2 1.2-2.1 2.4-2.6" />
      <path d="M12 21.25c-3.7 0-6.25-2.55-6.25-5.9 0-2.3 1.25-4.2 3.05-5.1A5.4 5.4 0 0112 9.5c.75 0 1.5.15 2.2.4 1.8.9 3.05 2.8 3.05 5.1 0 3.35-2.55 5.9-6.25 5.9z" />
    </svg>
  );
}

/** Explore browse category — Nutritionist */
export function LeafIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21c-4.5-1.5-7.5-5.25-7.5-9.75C4.5 5.25 8.25 3 12 3c0 4.5 1.5 7.5 4.5 9.75C13.5 15.75 12 18.75 12 21z" />
      <path d="M12 21V9" />
    </svg>
  );
}

/** Explore browse category — Boxing Coach */
export function BoxingGloveIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8.25 14.25V9a3.75 3.75 0 017.5 0v1.5" />
      <path d="M8.25 11.25h7.5a2.25 2.25 0 012.25 2.25v2.25a4.5 4.5 0 01-4.5 4.5h-3a4.5 4.5 0 01-4.5-4.5v-2.25a2.25 2.25 0 012.25-2.25z" />
      <path d="M9 18.75h6" />
    </svg>
  );
}

/** Explore browse category — Running Coach (figure) */
export function RunningFigureIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="14.25" cy="5.25" r="1.5" />
      <path d="M8.25 21l2.25-4.5 3-1.5 1.5 3 3 1.5M10.5 16.5l-2.25-3 3-2.25 3.75 1.5" />
    </svg>
  );
}

/** Homepage browse — Running & Endurance (shoe) */
export function RunningShoeIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4.5 15.5c0-1.5 1-2.5 2.5-3l5-1.5c1.2-.4 2.3-1.1 3.1-2.1L17 7.5c.4-.5 1.1-.7 1.7-.4.7.3 1 1.1.7 1.8l-1.2 2.6c-.4.9-.4 1.9 0 2.8l.6 1.4c.3.7 0 1.5-.7 1.8H6.2c-1 0-1.7-.8-1.7-1.8v-.2z" />
      <path d="M8 14.5h5.5M9.5 12.2l3.2-.9" />
    </svg>
  );
}

/** Explore browse category — Sports Performance */
export function AthleticBallIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4c2.2 2.4 3.4 5.1 3.4 8s-1.2 5.6-3.4 8M12 4c-2.2 2.4-3.4 5.1-3.4 8s1.2 5.6 3.4 8M4.5 10.5c2.5.6 5 .9 7.5.9s5-.3 7.5-.9M4.5 13.5c2.5-.6 5-.9 7.5-.9s5 .3 7.5.9" />
    </svg>
  );
}

/** Explore browse category — Yoga Instructor */
export function MeditationIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="5.5" r="1.85" />
      <path d="M8.5 20.5l3.5-5.5 3.5 5.5M7 13.75c1.6-1.4 3.2-2.1 5-2.1s3.4.7 5 2.1M8.25 11h7.5" />
    </svg>
  );
}

/** Explore browse category — Chiropractor */
export function SpineIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3.75v16.5M9.75 6h4.5M9 9.75h6M9.75 13.5h4.5M10.5 17.25h3" />
    </svg>
  );
}

/** Explore browse category — Physical Therapist */
export function MedicalCrossIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 7.5v9M7.5 12h9" />
      <rect x="4.5" y="4.5" width="15" height="15" rx="3" />
    </svg>
  );
}

/** Explore browse category — Strength Coach */
export function StrengthArmIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9.25 8.25a2.35 2.35 0 114.7 0 2.35 2.35 0 01-4.7 0z" />
      <path d="M7.5 11.25c1.4-1.2 2.7-1.7 4.1-1.1 2.1 1 2.9 3.5 2.2 6.3-.7 2.8-2.8 4.2-4.9 4.2" />
      <path d="M11 13c.7 1.4.7 2.8 0 4.2" />
      <path d="M14.75 12.5c1.1.3 2 .2 2.9-.5.7-.6 1.1-1.5 1.1-2.4" />
    </svg>
  );
}

/** Chevron for Filters expand affordance */
export function ChevronDownIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

/** Warning triangle for incomplete profile sections */
export function AlertTriangleIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

/** Checkmark icon for complete profile sections */
export function CheckIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

/** Checkmark circle for completed verification/status */
export function CheckCircleIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
