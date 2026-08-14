"use client";

import { useAuthSession } from "@/hooks/useAuthSession";
import { showSpecialistHeaderProBadge } from "@/lib/specialist-premium";

/** Neon Pro chip beside SMOAC — specialists on paid Pro or trial only. */
export function SiteHeaderProBadge() {
  const { isReady, session } = useAuthSession();
  if (!isReady || !showSpecialistHeaderProBadge(session)) return null;

  return (
    <span className="site-header__pro-badge" title="SMOAC Pro" aria-label="SMOAC Pro">
      Pro
    </span>
  );
}
