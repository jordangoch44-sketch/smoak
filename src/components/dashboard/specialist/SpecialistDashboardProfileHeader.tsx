interface SpecialistDashboardProfileHeaderProps {
  variant: "pending" | "live-free";
}

export function SpecialistDashboardProfileHeader({
  variant,
}: SpecialistDashboardProfileHeaderProps) {
  if (variant === "pending") {
    return (
      <header className="specialist-dash-profile-header">
        <p className="specialist-dash-profile-header__eyebrow">Submitted profile</p>
        <p className="specialist-dash-profile-header__hint">
          Preview how your profile will appear once approved.
        </p>
      </header>
    );
  }

  return (
    <header className="specialist-dash-profile-header">
      <div className="specialist-dash-profile-header__badges">
        <span className="dashboard-profile-status dashboard-profile-status--active">
          Live profile
        </span>
        <span className="specialist-dash-profile-header__plan">Free plan</span>
      </div>
      <p className="specialist-dash-profile-header__hint">
        Tap any section to edit
      </p>
    </header>
  );
}
