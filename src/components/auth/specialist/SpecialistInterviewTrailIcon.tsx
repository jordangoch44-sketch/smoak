import type { ReactNode } from "react";
import type { SpecialistInterviewTrailIcon as InterviewTrailIconName } from "@/lib/specialist-onboarding-interview";

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <svg
      className="interview-trail__icon-svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function SpecialistInterviewTrailIcon({
  name,
}: {
  name: InterviewTrailIconName;
}) {
  switch (name) {
    case "person":
      return (
        <IconFrame>
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="7" r="4" />
        </IconFrame>
      );
    case "briefcase":
      return (
        <IconFrame>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </IconFrame>
      );
    case "spark":
      return (
        <IconFrame>
          <path d="M12 3v4M12 17v4M5 12H3M21 12h-2M7.2 7.2 5.8 5.8M18.2 18.2l-1.4-1.4M7.2 16.8 5.8 18.2M18.2 5.8l-1.4 1.4" />
          <circle cx="12" cy="12" r="3" />
        </IconFrame>
      );
    case "mail":
      return (
        <IconFrame>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </IconFrame>
      );
    case "lock":
      return (
        <IconFrame>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </IconFrame>
      );
    case "phone":
      return (
        <IconFrame>
          <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3A2 2 0 0 1 18.5 20 15.5 15.5 0 0 1 4 5.5 2 2 0 0 1 6.5 3.5Z" />
        </IconFrame>
      );
    case "camera":
      return (
        <IconFrame>
          <path d="M4 8h3l2-3h6l2 3h3v11H4V8Z" />
          <circle cx="12" cy="13" r="3.5" />
        </IconFrame>
      );
    case "pin":
      return (
        <IconFrame>
          <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </IconFrame>
      );
    case "home":
      return (
        <IconFrame>
          <path d="m4 11 8-7 8 7" />
          <path d="M6 10v10h12V10" />
        </IconFrame>
      );
    case "map":
      return (
        <IconFrame>
          <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
          <path d="M9 4v14M15 6v14" />
        </IconFrame>
      );
    case "star":
      return (
        <IconFrame>
          <path d="m12 3 2.4 6.6H21l-5.4 4.2 2 6.7L12 16.8 6.4 20.5l2-6.7L3 9.6h6.6L12 3Z" />
        </IconFrame>
      );
    case "badge":
      return (
        <IconFrame>
          <circle cx="12" cy="8" r="5" />
          <path d="M8.5 12.5 7 21l5-3 5 3-1.5-8.5" />
        </IconFrame>
      );
    case "bio":
      return (
        <IconFrame>
          <path d="M5 4h9l5 5v11H5V4Z" />
          <path d="M14 4v5h5M8 13h8M8 17h5" />
        </IconFrame>
      );
    case "options":
      return (
        <IconFrame>
          <circle cx="12" cy="6" r="2" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
          <path d="M12 8v4M12 12 6 16M12 12l6 4" />
        </IconFrame>
      );
    case "price":
      return (
        <IconFrame>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7v10M9.5 9.5c.6-1 1.6-1.5 2.6-1.5 1.4 0 2.4.8 2.4 2s-1 2-2.5 2.3c-1.6.3-2.5.9-2.5 2.2 0 1.2 1.1 2 2.6 2 1 0 1.9-.4 2.5-1.3" />
        </IconFrame>
      );
    case "social":
      return (
        <IconFrame>
          <rect x="5" y="5" width="14" height="14" rx="4" />
          <circle cx="12" cy="12" r="3.25" />
          <circle cx="16.4" cy="7.6" r="0.8" fill="currentColor" stroke="none" />
        </IconFrame>
      );
    case "globe":
      return (
        <IconFrame>
          <circle cx="12" cy="12" r="8" />
          <path d="M4 12h16M12 4c2.2 2.4 3.3 5.1 3.3 8S14.2 17.6 12 20c-2.2-2.4-3.3-5.1-3.3-8S9.8 6.4 12 4Z" />
        </IconFrame>
      );
    case "preview":
      return (
        <IconFrame>
          <path d="M4 6h16v12H4V6Z" />
          <path d="m4 10 16-.01" />
          <circle cx="7" cy="8" r="0.6" fill="currentColor" stroke="none" />
        </IconFrame>
      );
    default:
      return null;
  }
}
