"use client";

import { useAuthSession } from "@/hooks/useAuthSession";
import {
  formatMembershipHeaderBadgeLabel,
  membershipBadgeToneForSession,
  showSpecialistHeaderProBadge,
} from "@/lib/specialist-premium";
import { cn } from "@/lib/utils";

/** Plan chip beside SMOAC — Free silver, Pro Trial violet, Pro blue, PRO+ SMOAC. */
export function SiteHeaderProBadge() {
  const { isReady, session } = useAuthSession();
  if (!isReady || !showSpecialistHeaderProBadge(session)) return null;

  const tone = membershipBadgeToneForSession(session);
  const label = formatMembershipHeaderBadgeLabel(session);
  const title =
    tone === "pro-trial"
      ? "SMOAC Pro Trial"
      : tone === "pro-plus"
        ? "SMOAC PRO+"
        : "SMOAC Pro";

  return (
    <span
      className={cn(
        "site-header__pro-badge",
        tone === "pro-plus" && "site-header__pro-badge--pro-plus",
        tone === "pro-trial" && "site-header__pro-badge--pro-trial"
      )}
      title={title}
      aria-label={title}
    >
      {label}
    </span>
  );
}
