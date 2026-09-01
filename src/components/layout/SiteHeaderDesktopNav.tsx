"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useSavedTrainers } from "@/hooks/useSavedTrainers";
import { useStableClientState } from "@/hooks/useStableClientState";
import {
  getMobileBottomNavItems,
  isActiveNavItem,
  type MobileBottomNavItemId,
} from "@/lib/mobile-bottom-nav";
import { SITE_ROUTES } from "@/lib/navigation";
import { formatSavedCountBadge } from "@/lib/saved-ui";
import { canSaveSpecialists } from "@/lib/specialist-saves";
import { cn } from "@/lib/utils";

const DESKTOP_NAV_LABELS: Record<MobileBottomNavItemId, string> = {
  home: "Marketplace",
  search: "Search",
  saved: "Saved",
  profile: "Profile",
};

function SiteHeaderDesktopNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { clientReady } = useStableClientState();
  const { session } = useAuthSession();
  const { isReady: savesReady, isSavesReady, savedCount } = useSavedTrainers();
  const items = useMemo(
    () => getMobileBottomNavItems(session),
    [session]
  );

  const showSaveBadge =
    clientReady &&
    savesReady &&
    isSavesReady &&
    canSaveSpecialists(session) &&
    savedCount > 0;

  return (
    <nav className="site-header-desktop-nav" aria-label="Main">
      <ul className="site-header-desktop-nav__list">
        {items.map((item) => {
          const active = isActiveNavItem(item.id, pathname, searchParams);
          const label =
            item.id === "saved" && item.label === "Overview"
              ? "Overview"
              : DESKTOP_NAV_LABELS[item.id];

          return (
            <li key={item.id} className="site-header-desktop-nav__item">
              <Link
                href={item.href}
                className={cn(
                  "site-header-desktop-nav__link smoac-tap",
                  active && "site-header-desktop-nav__link--active"
                )}
                aria-current={active ? "page" : undefined}
              >
                {label}
                {item.id === "saved" &&
                item.href === SITE_ROUTES.saved &&
                showSaveBadge ? (
                  <span className="site-header-desktop-nav__badge" aria-hidden>
                    {formatSavedCountBadge(savedCount)}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Desktop-only horizontal nav — same routes as mobile bottom bar, different presentation. */
export function SiteHeaderDesktopNav() {
  return (
    <Suspense fallback={null}>
      <SiteHeaderDesktopNavInner />
    </Suspense>
  );
}
