import type { ReactNode } from "react";

function StatIconSvg({ children }: { children: ReactNode }) {
  return (
    <svg
      className="h-[18px] w-[18px] text-white/65"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.25}
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** Picks a minimal icon from stat label keywords */
export function ProfileStatIcon({ label }: { label: string }) {
  const lower = label.toLowerCase();

  if (lower.includes("review")) {
    return (
      <StatIconSvg>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.603a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
        />
      </StatIconSvg>
    );
  }

  if (
    lower.includes("year") ||
    lower.includes("experience") ||
    lower.includes("pilates")
  ) {
    return (
      <StatIconSvg>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </StatIconSvg>
    );
  }

  if (
    lower.includes("transformation") ||
    lower.includes("client") ||
    lower.includes("coached") ||
    lower.includes("plan") ||
    lower.includes("restore")
  ) {
    return (
      <StatIconSvg>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      </StatIconSvg>
    );
  }

  if (
    lower.includes("athlete") ||
    lower.includes("collegiate") ||
    lower.includes("boxing") ||
    lower.includes("competition") ||
    lower.includes("marathon") ||
    lower.includes("sub-3")
  ) {
    return (
      <StatIconSvg>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0V8.25M12 5.25v13.5m0-13.5a3 3 0 00-3-3H9a3 3 0 00-3 3m3 0h3m-3 0a3 3 0 00-3 3m6 0a3 3 0 00-3-3m0 0h3m0 0a3 3 0 013 3"
        />
      </StatIconSvg>
    );
  }

  if (lower.includes("certified") || lower.includes("dietitian")) {
    return (
      <StatIconSvg>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.697 50.697 0 017.74-3.342"
        />
      </StatIconSvg>
    );
  }

  if (lower.includes("pain") || lower.includes("mobility")) {
    return (
      <StatIconSvg>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </StatIconSvg>
    );
  }

  if (lower.includes("posture") || lower.includes("strength")) {
    return (
      <StatIconSvg>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        />
      </StatIconSvg>
    );
  }

  return (
    <StatIconSvg>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18L9 11.25l4.306 4.307a1.125 1.125 0 001.52 0L21 7.5"
      />
    </StatIconSvg>
  );
}
