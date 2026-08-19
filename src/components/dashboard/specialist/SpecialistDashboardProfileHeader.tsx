interface SpecialistDashboardProfileHeaderProps {
  variant: "pending" | "live-free";
}

export function SpecialistDashboardProfileHeader({
  variant,
}: SpecialistDashboardProfileHeaderProps) {
  if (variant === "pending") {
    return (
      <header className="specialist-dash-profile-header">
        <p className="specialist-dash-profile-header__eyebrow">Your submitted profile</p>
        <p className="specialist-dash-profile-header__hint">
          This preview is locked while SMOAC reviews your application.
        </p>
      </header>
    );
  }

  return (
    <header className="specialist-dash-profile-header">
      <p className="specialist-dash-profile-header__eyebrow">Edit profile</p>
      <p className="specialist-dash-profile-header__hint">
        Tap a row to update. Saves go live on Marketplace — your public profile
        layout stays the same for clients.
      </p>
    </header>
  );
}
