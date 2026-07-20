interface ProfilePillGridProps {
  items?: string[] | null;
}

export function ProfilePillGrid({ items }: ProfilePillGridProps) {
  const safeItems = Array.isArray(items)
    ? items.filter((item) => typeof item === "string" && item.trim().length > 0)
    : [];
  if (safeItems.length === 0) return null;

  return (
    <ul className="profile-pill-grid">
      {safeItems.map((item) => (
        <li key={item}>
          <span className="profile-tag-pill profile-tag-pill--grid">{item}</span>
        </li>
      ))}
    </ul>
  );
}
