interface ProfilePillGridProps {
  items: string[];
}

export function ProfilePillGrid({ items }: ProfilePillGridProps) {
  return (
    <ul className="profile-pill-grid">
      {items.map((item) => (
        <li key={item}>
          <span className="profile-tag-pill profile-tag-pill--grid">{item}</span>
        </li>
      ))}
    </ul>
  );
}
