import { getReputationSourceDefinition } from "@/lib/specialist-reputation";
import type { ReputationSourceId } from "@/types/specialist-reputation";
import { cn } from "@/lib/utils";

interface ReputationSourceBadgeProps {
  sourceId: ReputationSourceId;
  className?: string;
}

export function ReputationSourceBadge({
  sourceId,
  className,
}: ReputationSourceBadgeProps) {
  const definition = getReputationSourceDefinition(sourceId);
  const label = definition?.badgeLabel ?? sourceId.charAt(0).toUpperCase();

  return (
    <span
      className={cn(
        "dashboard-reputation-badge",
        `dashboard-reputation-badge--${sourceId}`,
        className
      )}
      aria-hidden
    >
      {label}
    </span>
  );
}
