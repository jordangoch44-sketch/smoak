import type { AdminApplicationStatusLabel, AdminSpecialistVisibility } from "@/types/admin";
import type { AdPlacementStatus, TierSubscriptionStatus } from "@/types/admin-revenue";

type BadgeLabel =
  | AdminApplicationStatusLabel
  | AdminSpecialistVisibility
  | "active"
  | "inactive"
  | "deactivated"
  | TierSubscriptionStatus
  | AdPlacementStatus;

export function AdminStatusBadge({ label }: { label: BadgeLabel }) {
  return <span className={`admin-badge admin-badge--${label}`}>{label}</span>;
}
