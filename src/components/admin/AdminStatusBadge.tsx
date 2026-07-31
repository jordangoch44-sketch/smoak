import type { AdminApplicationStatusLabel, AdminSpecialistVisibility } from "@/types/admin";

type BadgeLabel =
  | AdminApplicationStatusLabel
  | AdminSpecialistVisibility
  | "active"
  | "inactive"
  | "deactivated"
  | "trial"
  | "cancelled"
  | "scheduled"
  | "expired";

export function AdminStatusBadge({ label }: { label: BadgeLabel }) {
  return <span className={`admin-badge admin-badge--${label}`}>{label}</span>;
}
