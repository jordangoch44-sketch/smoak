"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HeaderChromeLink } from "@/components/layout/HeaderChromeLink";
import { Suspense, useEffect, useMemo, useState } from "react";
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

function SiteHeaderDesktopNavInner({
  searchParams,
}: {
  searchParams: URLSearchParams | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { clientReady } = useStableClientState();
  const { session } = useAuthSession();
  const { isReady: savesReady, isSavesReady, savedCount } = useSavedTrainers();
  const [pendingId, setPendingId] = useState<MobileBottomNavItemId | null>(
    null
  );
  const items = useMemo(
    () => getMobileBottomNavItems(session),
    [session]
  );

  useEffect(() => {
    setPendingId(null);
  }, [pathname, searchParams]);

  useEffect(() => {
    for (const item of items) {
      try {
        router.prefetch(item.href);
      } catch {
        /* best-effort */
      }
    }
  }, [items, router]);

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
          const active =
            pendingId != null
              ? pendingId === item.id
              : isActiveNavItem(item.id, pathname, searchParams);
          const label =
            item.id === "saved" && item.label === "Overview"
              ? "Overview"
              : DESKTOP_NAV_LABELS[item.id];

          return (
            <li key={item.id} className="site-header-desktop-nav__item">
              <HeaderChromeLink
                href={item.href}
                className={cn(
                  "site-header-desktop-nav__link smoac-tap",
                  active && "site-header-desktop-nav__link--active"
                )}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  if (!isActiveNavItem(item.id, pathname, searchParams)) {
                    setPendingId(item.id);
                  }
                }}
              >
                {label}
                {item.id === "saved" &&
                item.href === SITE_ROUTES.saved &&
                showSaveBadge ? (
                  <span className="site-header-desktop-nav__badge" aria-hidden>
                    {formatSavedCountBadge(savedCount)}
                  </span>
                ) : null}
              </HeaderChromeLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SiteHeaderDesktopNavFromRoute() {
  const searchParams = useSearchParams();
  return <SiteHeaderDesktopNavInner searchParams={searchParams} />;
}

/** Desktop-only horizontal nav — same routes as mobile bottom bar, different presentation. */
export function SiteHeaderDesktopNav() {
  return (
    <Suspense fallback={<SiteHeaderDesktopNavInner searchParams={null} />}>
      <SiteHeaderDesktopNavFromRoute />
    </Suspense>
  );
}
