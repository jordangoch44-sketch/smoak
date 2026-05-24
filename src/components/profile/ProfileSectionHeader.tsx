interface ProfileSectionHeaderProps {
  title: string;
  trailing?: React.ReactNode;
}

export function ProfileSectionHeader({
  title,
  trailing,
}: ProfileSectionHeaderProps) {
  if (trailing) {
    return (
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="profile-section-header">{title}</h2>
        {trailing}
      </div>
    );
  }

  return <h2 className="profile-section-header">{title}</h2>;
}
