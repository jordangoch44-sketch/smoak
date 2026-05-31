"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { memo, useCallback, useMemo, type MouseEvent } from "react";
import { TapLink } from "@/components/ui/TapLink";
import {
  CompassIcon,
  HeartIcon,
  HomeIcon,
  SearchIcon,
  UserIcon,
} from "@/components/ui/icons";
import { useBeginBottomNavTransition } from "@/contexts/MobileBottomNavTransitionContext";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useMobileBottomNavHidden } from "@/hooks/useMobileBottomNavHidden";
import { useSavedTrainers } from "@/hooks/useSavedTrainers";
import { useStableClientState } from "@/hooks/useStableClientState";
import { useTabletViewport } from "@/hooks/useTabletViewport";
import {
  getActiveMobileBottomNavItemId,
  getMobileBottomNavItems,
  getMobileBottomNavProfileAuthState,
  isMobileBottomNavItemActive,
  type MobileBottomNavItem,
  type MobileBottomNavItemId,
  type MobileBottomNavProfileAuthState,
} from "@/lib/mobile-bottom-nav";
import { getBottomNavTransitionKind } from "@/lib/mobile-bottom-nav-transition";
import { formatSavedCountBadge } from "@/lib/saved-ui";
import { canSaveSpecialists } from "@/lib/specialist-saves";
import { cn } from "@/lib/utils";

function NavIcon({
  id,
  active,
  savedCount,
}: {
  id: MobileBottomNavItemId;
  active: boolean;
  savedCount: number;
}) {
  const className = cn(
    "mobile-bottom-nav__icon",
    active && "mobile-bottom-nav__icon--active",
    id === "saved" && savedCount > 0 && "mobile-bottom-nav__icon--has-saves"
  );

  switch (id) {
    case "search":
      return <SearchIcon className={className} />;
    case "saved":
      return (
        <HeartIcon className={className} filled={active || savedCount > 0} />
      );
    case "home":
      return <HomeIcon className={className} />;
    case "discover":
      return <CompassIcon className={className} />;
    default:
      return null;
  }
}

const ProfileNavItem = memo(function ProfileNavItem({
  item,
  active,
  authState,
  onNavigate,
}: {
  item: MobileBottomNavItem;
  active: boolean;
  authState: MobileBottomNavProfileAuthState;
  onNavigate: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const signedIn = authState === "signed-in";

  return (
    <TapLink
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "mobile-bottom-nav__item smoac-hit-target mobile-bottom-nav__item--profile",
        active && "mobile-bottom-nav__item--active",
        signedIn
          ? "mobile-bottom-nav__item--profile-signed-in"
          : "mobile-bottom-nav__item--profile-signed-out"
      )}
      aria-label={signedIn ? "Profile, logged in" : "Sign in"}
      aria-current={active ? "page" : undefined}
      data-profile-auth={authState}
    >
      <span
        className={cn(
          "mobile-bottom-nav__icon-shell mobile-bottom-nav__icon-shell--profile",
          signedIn && "mobile-bottom-nav__icon-shell--profile-signed-in"
        )}
      >
        <UserIcon
          className={cn(
            "mobile-bottom-nav__icon mobile-bottom-nav__icon--profile",
            active && "mobile-bottom-nav__icon--active"
          )}
        />
      </span>
    </TapLink>
  );
});

const SavedNavBadge = memo(function SavedNavBadge({
  count,
}: {
  count: number;
}) {
  return (
    <span className="mobile-bottom-nav__badge" aria-hidden>
      {formatSavedCountBadge(count)}
    </span>
  );
});

const MobileBottomNavItems = memo(function MobileBottomNavItems({
  items,
  pathname,
  profileAuthState,
  showSaveBadge,
  savedCount,
  onNavClick,
}: {
  items: MobileBottomNavItem[];
  pathname: string;
  profileAuthState: MobileBottomNavProfileAuthState;
  showSaveBadge: boolean;
  savedCount: number;
  onNavClick: (
    item: MobileBottomNavItem,
    event: MouseEvent<HTMLAnchorElement>
  ) => void;
}) {
  return (
    <ul className="mobile-bottom-nav__list">
      {items.map((item) => {
        const active = isMobileBottomNavItemActive(item.id, pathname);

        if (item.id === "profile") {
          return (
            <li key={item.id} className="mobile-bottom-nav__item-wrap">
              <ProfileNavItem
                item={item}
                active={active}
                authState={profileAuthState}
                onNavigate={(event) => onNavClick(item, event)}
              />
            </li>
          );
        }

        return (
          <li key={item.id} className="mobile-bottom-nav__item-wrap">
            <TapLink
              href={item.href}
              onClick={(event) => onNavClick(item, event)}
              className={cn(
                "mobile-bottom-nav__item smoac-hit-target",
                item.isPrimary && "mobile-bottom-nav__item--primary",
                active && "mobile-bottom-nav__item--active"
              )}
              aria-label={
                item.id === "saved" && showSaveBadge
                  ? `${item.label}, ${savedCount} saved`
                  : item.label
              }
              aria-current={active ? "page" : undefined}
            >
              <span
                className={cn(
                  "mobile-bottom-nav__icon-shell",
                  item.isPrimary && "mobile-bottom-nav__icon-shell--primary"
                )}
              >
                <NavIcon
                  id={item.id}
                  active={active}
                  savedCount={
                    item.id === "saved" && showSaveBadge ? savedCount : 0
                  }
                />
                {item.id === "saved" && showSaveBadge ? (
                  <SavedNavBadge count={savedCount} />
                ) : null}
              </span>
            </TapLink>
          </li>
        );
      })}
    </ul>
  );
});

function MobileBottomNavShell() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hidden = useMobileBottomNavHidden();
  const beginBottomNavTransition = useBeginBottomNavTransition();
  const isTabletViewport = useTabletViewport();
  const { clientReady } = useStableClientState();
  const { isReady, session } = useAuthSession();
  const { isReady: savesReady, savedCount } = useSavedTrainers();

  const profileAuthState = getMobileBottomNavProfileAuthState(
    clientReady,
    isReady,
    session
  );
  const showSaveBadge =
    clientReady && savesReady && canSaveSpecialists(session) && savedCount > 0;
  const items = useMemo(
    () => getMobileBottomNavItems(session),
    [session]
  );

  const handleNavClick = useCallback(
    (item: MobileBottomNavItem, event: MouseEvent<HTMLAnchorElement>) => {
      const kind = getBottomNavTransitionKind(
        item.id,
        pathname,
        searchParams,
        item.href
      );
      if (kind === "none") return;

      const fromId =
        getActiveMobileBottomNavItemId(pathname, searchParams) ?? item.id;

      event.preventDefault();
      beginBottomNavTransition(item.href, kind, { fromId, toId: item.id });
    },
    [beginBottomNavTransition, pathname, searchParams]
  );

  if (!isTabletViewport) return null;

  return (
    <nav
      className={cn("mobile-bottom-nav", hidden && "mobile-bottom-nav--hidden")}
      aria-label="Mobile navigation"
      aria-hidden={hidden}
    >
      <div className="mobile-bottom-nav__scrim" aria-hidden />

      <div className="mobile-bottom-nav__float">
        <div className="mobile-bottom-nav__pill">
          <div className="mobile-bottom-nav__aurora" aria-hidden />
          <div className="mobile-bottom-nav__sheen" aria-hidden />

          <MobileBottomNavItems
            items={items}
            pathname={pathname}
            profileAuthState={profileAuthState}
            showSaveBadge={showSaveBadge}
            savedCount={savedCount}
            onNavClick={handleNavClick}
          />
        </div>
      </div>
    </nav>
  );
}

export const MobileBottomNav = memo(MobileBottomNavShell);
