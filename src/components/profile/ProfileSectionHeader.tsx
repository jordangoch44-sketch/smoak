interface ProfileSectionHeaderProps {
  title: string;
  trailing?: React.ReactNode;
}

export function ProfileSectionHeader({
  title,
  trailing,
}: ProfileSectionHeaderProps) {
  return (
    <div className="profile-section-header-row">
      <h2 className="profile-section-header">{title}</h2>
      {trailing}
    </div>
  );
}
