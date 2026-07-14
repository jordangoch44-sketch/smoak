import type { ReactNode } from "react";
import { HeartIcon, ShieldCheckIcon } from "@/components/ui/icons";

function TrustGlyph({ children }: { children: ReactNode }) {
  return (
    <svg
      className="profile-trust-card__glyph"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.35}
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** Maps “Why clients choose me” copy to a small premium glyph */
export function ProfileTrustIcon({ label }: { label: string }) {
  const lower = label.toLowerCase();

  if (
    lower.includes("gentle") ||
    lower.includes("care") ||
    lower.includes("calm") ||
    lower.includes("support") ||
    lower.includes("safe")
  ) {
    return (
      <TrustGlyph>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 8.25A4.5 4.5 0 0112 3.75a4.5 4.5 0 014.5 4.5v.75H18a2.25 2.25 0 012.25 2.25v6.75A2.25 2.25 0 0118 19.5H6a2.25 2.25 0 01-2.25-2.25V11.25A2.25 2.25 0 016 9h1.5V8.25z"
        />
      </TrustGlyph>
    );
  }

  if (
    lower.includes("holistic") ||
    lower.includes("balance") ||
    lower.includes("mind-body") ||
    lower.includes("mind body") ||
    lower.includes("wellness")
  ) {
    return (
      <TrustGlyph>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3.75a8.25 8.25 0 100 16.5 8.25 8.25 0 000-16.5z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 12h16.5M12 3.75c2.25 2.4 3.375 4.95 3.375 8.25S14.25 17.85 12 20.25M12 3.75C9.75 6.15 8.625 8.7 8.625 12S9.75 17.85 12 20.25"
        />
      </TrustGlyph>
    );
  }

  if (
    lower.includes("communication") ||
    lower.includes("message") ||
    lower.includes("responsive") ||
    lower.includes("fast")
  ) {
    return (
      <TrustGlyph>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.625 9.75h6.75M8.625 12.75h4.5m-7.875 6.375l2.006-2.006a.75.75 0 01.53-.22h9.114a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0016.875 4.5H7.125A2.25 2.25 0 004.875 6.75v7.899a2.25 2.25 0 002.25 2.25h.89a.75.75 0 01.53.22L9.75 19.125"
        />
      </TrustGlyph>
    );
  }

  if (
    lower.includes("pain") ||
    lower.includes("relief") ||
    lower.includes("recovery") ||
    lower.includes("heal") ||
    lower.includes("rehab")
  ) {
    return <HeartIcon className="profile-trust-card__glyph" />;
  }

  if (
    lower.includes("custom") ||
    lower.includes("plan") ||
    lower.includes("program") ||
    lower.includes("personal") ||
    lower.includes("detail")
  ) {
    return (
      <TrustGlyph>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5"
        />
      </TrustGlyph>
    );
  }

  if (
    lower.includes("trust") ||
    lower.includes("expert") ||
    lower.includes("certified") ||
    lower.includes("technical") ||
    lower.includes("accountab") ||
    lower.includes("verified")
  ) {
    return <ShieldCheckIcon className="profile-trust-card__glyph" />;
  }

  if (
    lower.includes("result") ||
    lower.includes("motivation") ||
    lower.includes("intense") ||
    lower.includes("performance")
  ) {
    return (
      <TrustGlyph>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
        />
      </TrustGlyph>
    );
  }

  return (
    <TrustGlyph>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </TrustGlyph>
  );
}
