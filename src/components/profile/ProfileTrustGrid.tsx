interface ProfileTrustGridProps {
  items: string[];
}

export function ProfileTrustGrid({ items }: ProfileTrustGridProps) {
  return (
    <ul className="profile-trust-grid">
      {items.map((item) => (
        <li key={item} className="profile-trust-card">
          <span className="profile-trust-card__dot" aria-hidden />
          <span className="profile-trust-card__label">{item}</span>
        </li>
      ))}
    </ul>
  );
}
