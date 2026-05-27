import {
  formatReputationRating,
  getReputationSourceDisplayName,
} from "@/lib/specialist-reputation";
import type { ReputationSourceSummary } from "@/types/specialist-reputation";
import { ReputationSourceBadge } from "./ReputationSourceBadge";

interface ReputationSourceRowProps {
  source: ReputationSourceSummary;
  onConnect?: (sourceId: string) => void;
}

export function ReputationSourceRow({ source, onConnect }: ReputationSourceRowProps) {
  const isConnected = source.connectedStatus === "connected";
  const displayName = source.sourceName || getReputationSourceDisplayName(source.sourceId);

  if (!isConnected) {
    return (
      <div className="dashboard-reputation-source dashboard-reputation-source--disconnected">
        <div className="dashboard-reputation-source__lead">
          <ReputationSourceBadge sourceId={source.sourceId} />
          <span className="dashboard-reputation-source__name">{displayName}</span>
        </div>
        <button
          type="button"
          className="dashboard-reputation-connect"
          onClick={() => onConnect?.(source.sourceId)}
        >
          {source.connectCtaLabel ?? `Connect ${displayName} Reviews`}
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-reputation-source dashboard-reputation-source--connected">
      <div className="dashboard-reputation-source__lead">
        <ReputationSourceBadge sourceId={source.sourceId} />
        <div className="dashboard-reputation-source__copy">
          <span className="dashboard-reputation-source__name">{displayName}</span>
          <span className="dashboard-reputation-source__count">
            {source.totalReviews} review{source.totalReviews === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      {source.averageRating != null ? (
        <span className="dashboard-reputation-source__rating">
          ★ {formatReputationRating(source.averageRating)}
        </span>
      ) : null}
    </div>
  );
}
