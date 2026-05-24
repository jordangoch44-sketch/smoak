import type { TrainerCityRanking } from "@/data/city-rankings";

interface ProfileRankBadgeProps {
  ranking: TrainerCityRanking;
}

function getBadgeLabel(rank: number): string {
  if (rank === 1) return "#1 Ranked";
  if (rank <= 3) return `#${rank} Ranked`;
  return "Top 50";
}

export function ProfileRankBadge({ ranking }: ProfileRankBadgeProps) {
  const label = getBadgeLabel(ranking.rank);

  return (
    <span
      className="profile-rank-badge"
      title={`${ranking.listingTitle} · #${ranking.rank}`}
    >
      <span className="profile-rank-badge__icon" aria-hidden>
        <svg
          width="12"
          height="13"
          viewBox="0 0 12 13"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6 1.1L9.4 2.45C9.72 2.58 9.92 2.9 9.9 3.25L9.65 7.05C9.62 7.55 9.35 8 8.92 8.28L6.35 9.92C6.14 10.06 5.86 10.06 5.65 9.92L3.08 8.28C2.65 8 2.38 7.55 2.35 7.05L2.1 3.25C2.08 2.9 2.28 2.58 2.6 2.45L6 1.1Z"
            stroke="currentColor"
            strokeWidth="0.85"
            strokeLinejoin="round"
          />
          <path
            d="M4.35 6.45L5.55 7.65L7.85 5.35"
            stroke="currentColor"
            strokeWidth="0.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="profile-rank-badge__label">{label}</span>
    </span>
  );
}
