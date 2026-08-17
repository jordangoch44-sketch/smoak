import type { SocialLinks as SocialLinksType } from "@/types";
import { resolveInstagramProfileUrl } from "@/lib/instagram-profile-url";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";

interface SocialLinksProps {
  social: SocialLinksType;
}

/** Public connect pills — Google review fields live in the Google Reviews section. */
const socialLabels: Partial<Record<keyof SocialLinksType, string>> = {
  instagram: "Instagram",
  twitter: "X",
  linkedin: "LinkedIn",
  website: "Website",
  tiktok: "TikTok",
};

function resolveSocialHref(
  key: keyof SocialLinksType,
  raw: string
): string | null {
  const value = raw.trim();
  if (!value || value === "#" || value === "/") return null;

  if (key === "instagram") {
    return resolveInstagramProfileUrl(value);
  }

  if (/^https?:\/\//i.test(value)) return value;
  if (key === "website" || key === "tiktok" || key === "linkedin" || key === "twitter") {
    return `https://${value.replace(/^\/+/, "")}`;
  }
  return value;
}

export function SocialLinks({ social }: SocialLinksProps) {
  const links = (
    Object.entries(social) as [keyof SocialLinksType, string | undefined][]
  )
    .filter(([key, url]) => Boolean(url) && Boolean(socialLabels[key]))
    .map(([key, url]) => {
      const href = resolveSocialHref(key, url ?? "");
      if (!href) return null;
      return { key, href, label: socialLabels[key]! };
    })
    .filter((item): item is { key: keyof SocialLinksType; href: string; label: string } =>
      item != null
    );

  if (links.length === 0) return null;

  return (
    <ProfileSection variant="panel" aria-label="Connect">
      <ProfileSectionHeader title="Connect" />
      <ul className="profile-section-body profile-pill-grid">
        {links.map(({ key, href, label }) => (
          <li key={key}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="profile-tag-pill profile-tag-pill--grid transition-colors active:border-white/12 active:text-white/90 sm:hover:border-white/10 sm:hover:text-white/85"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </ProfileSection>
  );
}
