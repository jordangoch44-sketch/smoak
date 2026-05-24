import type { Trainer } from "@/types";
import { ProfileStatIcon } from "./ProfileStatIcon";

interface ProfileResultsSnapshotProps {
  trainer: Trainer;
  /** Sits directly under hero rating/price when true */
  embedded?: boolean;
}

export function ProfileResultsSnapshot({
  trainer,
  embedded = false,
}: ProfileResultsSnapshotProps) {
  const stats = [
    ...trainer.resultsSnapshot,
    `${trainer.reviewCount} Reviews`,
  ];

  const grid = (
    <ul className="profile-stat-grid">
      {stats.map((label) => (
        <li key={label} className="profile-stat-card">
          <span className="profile-stat-card__icon" aria-hidden>
            <ProfileStatIcon label={label} />
          </span>
          <span className="profile-stat-card__label">{label}</span>
        </li>
      ))}
    </ul>
  );

  if (embedded) {
    return (
      <div className="profile-hero__stats" aria-label="Results snapshot">
        <p className="profile-hero__stats-label">Results snapshot</p>
        {grid}
      </div>
    );
  }

  return (
    <div className="profile-section profile-section--panel" aria-label="Results snapshot">
      <h2 className="profile-section-header">Results snapshot</h2>
      <div className="profile-section-body">{grid}</div>
    </div>
  );
}
