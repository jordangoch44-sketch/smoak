import { ProfileTrustIcon } from "./ProfileTrustIcon";

interface ProfileTrustGridProps {
  items: string[];
}

export function ProfileTrustGrid({ items }: ProfileTrustGridProps) {
  return (
    <ul className="profile-trust-grid">
      {items.map((item) => (
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
