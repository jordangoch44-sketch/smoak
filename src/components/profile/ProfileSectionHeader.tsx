import type { ComponentType } from "react";
import {
  CheckCircleIcon,
  DumbbellIcon,
  HelpCircleIcon,
  LocationMarkIcon,
  TrophyIcon,
  UserIcon,
} from "@/components/ui/icons";
import { PRICING_PACKAGES_SECTION_TITLE } from "@/lib/specialist-pricing";
import { RIGHT_FIT_SECTION_TITLE } from "@/lib/specialist-right-fit";

interface ProfileSectionHeaderProps {
  title: string;
  trailing?: React.ReactNode;
}

interface GlyphProps {
  className?: string;
}

function SpecialtiesIcon({ className }: GlyphProps) {
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
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09zM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456z"
      />
    </svg>
  );
}

function DollarIcon({ className }: GlyphProps) {
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
        d="M12 3.75v16.5M17 7.5h-6.25a2.75 2.75 0 0 0 0 5.5h2.5a2.75 2.75 0 0 1 0 5.5H7"
      />
    </svg>
  );
}

function CoachingStyleIcon({ className }: GlyphProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path strokeLinecap="round" d="M4 8h16M4 16h16" />
      <circle cx="9" cy="8" r="1.7" />
      <circle cx="15" cy="16" r="1.7" />
    </svg>
  );
}

const SECTION_ICONS: Record<string, ComponentType<GlyphProps>> = {
  "About Me": UserIcon,
  Specialties: SpecialtiesIcon,
  [RIGHT_FIT_SECTION_TITLE]: HelpCircleIcon,
  "Location and travel": LocationMarkIcon,
  Credentials: CheckCircleIcon,
  "Coaching style": CoachingStyleIcon,
  "Training options": DumbbellIcon,
  [PRICING_PACKAGES_SECTION_TITLE]: DollarIcon,
  "Client Results": TrophyIcon,
};

export function ProfileSectionHeader({
  title,
  trailing,
}: ProfileSectionHeaderProps) {
  const Icon = SECTION_ICONS[title];

  return (
    <div className="profile-section-header-row">
      <div className="profile-section-header-lead">
        {Icon ? (
          <Icon className="profile-section-header-icon" />
        ) : null}
        <h2 className="profile-section-header">{title}</h2>
      </div>
      {trailing}
    </div>
  );
}
