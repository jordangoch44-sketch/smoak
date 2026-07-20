import { ProfileTrustIcon } from "./ProfileTrustIcon";

interface ProfileTrustGridProps {
  items?: string[] | null;
}

export function ProfileTrustGrid({ items }: ProfileTrustGridProps) {
  const safeItems = Array.isArray(items)
    ? items.filter((item) => typeof item === "string" && item.trim().length > 0)
    : [];
  if (safeItems.length === 0) return null;

  return (
    <ul className="profile-trust-grid">
      {safeItems.map((item) => (
        <li key={item}>
          <button type="button" className="smoac-control profile-trust-card">
            <span className="profile-trust-card__icon" aria-hidden>
              <ProfileTrustIcon label={item} />
            </span>
            <span className="profile-trust-card__label">{item}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
