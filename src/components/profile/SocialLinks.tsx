import type { SocialLinks as SocialLinksType } from "@/types";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";

interface SocialLinksProps {
  social: SocialLinksType;
}

const socialLabels: Record<keyof SocialLinksType, string> = {
  instagram: "Instagram",
  twitter: "X",
  linkedin: "LinkedIn",
  website: "Website",
  tiktok: "TikTok",
};

export function SocialLinks({ social }: SocialLinksProps) {
  const links = Object.entries(social).filter(([, url]) => url);

  if (links.length === 0) return null;

  return (
    <ProfileSection variant="panel" aria-label="Connect">
      <ProfileSectionHeader title="Connect" />
      <ul className="profile-section-body profile-pill-grid">
        {links.map(([key, url]) => (
          <li key={key}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="profile-tag-pill profile-tag-pill--grid transition-colors active:border-white/12 active:text-white/90 sm:hover:border-white/10 sm:hover:text-white/85"
            >
              {socialLabels[key as keyof SocialLinksType]}
            </a>
          </li>
        ))}
      </ul>
    </ProfileSection>
  );
}
