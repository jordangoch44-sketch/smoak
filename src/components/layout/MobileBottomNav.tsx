"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { memo, useCallback, useMemo, type MouseEvent } from "react";
import { TapLink } from "@/components/ui/TapLink";
import {
  HeartIcon,
  HomeIcon,
  SearchIcon,
  UserIcon,
  UserPlusIcon,
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
  isActiveNavItem,
  type MobileBottomNavItem,
  type MobileBottomNavItemId,
  type MobileBottomNavProfileAuthState,
} from "@/lib/mobile-bottom-nav";
import { getBottomNavTransitionKind } from "@/lib/mobile-bottom-nav-transition";
import { formatSavedCountBadge } from "@/lib/saved-ui";
import { canSaveSpecialists } from "@/lib/specialist-saves";
import { cn } from "@/lib/utils";

const NavIcon = memo(function NavIcon({
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
    id === "saved" && savedCount > 0 && "mobile-bottom-nav__icon--has-saves",
    id === "profile" && "mobile-bottom-nav__icon--profile"
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
    case "join":
      return <UserPlusIcon className={className} />;
    case "profile":
      return <UserIcon className={className} />;
    default:
      return null;
  }
});

const BottomNavItemLink = memo(function BottomNavItemLink({
  item,
  active,
  profileAuthState,
  showSaveBadge,
  savedCount,
  onNavigate,
}: {
  item: MobileBottomNavItem;
  active: boolean;
  profileAuthState?: MobileBottomNavProfileAuthState;
  showSaveBadge: boolean;
  savedCount: number;
  onNavigate: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const isProfile = item.id === "profile";
  const signedIn = profileAuthState === "signed-in";

  return (
    <TapLink
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "mobile-bottom-nav__item smoac-hit-target",
        item.isPrimary && "mobile-bottom-nav__item--primary",
        isProfile && "mobile-bottom-nav__item--profile",
        isProfile &&
          (signedIn
            ? "mobile-bottom-nav__item--profile-signed-in"
            : "mobile-bottom-nav__item--profile-signed-out"),
        active && "mobile-bottom-nav__item--active"
      )}
      aria-label={
        isProfile
          ? signedIn
            ? "Profile, logged in"
            : "Sign in"
          : item.id === "saved" && showSaveBadge
            ? `${item.label}, ${savedCount} saved`
            : item.label
      }
      aria-current={active ? "page" : undefined}
      {...(isProfile ? { "data-profile-auth": profileAuthState } : {})}
    >
      <span
        className={cn(
          "mobile-bottom-nav__icon-shell",
          item.isPrimary && "mobile-bottom-nav__icon-shell--primary",
          isProfile && "mobile-bottom-nav__icon-shell--profile",
          active && "mobile-bottom-nav__icon-shell--active"
        )}
      >
        <NavIcon
          id={item.id}
          active={active}
          savedCount={item.id === "saved" && showSaveBadge ? savedCount : 0}
        />
        {item.id === "saved" && showSaveBadge ? (
          <SavedNavBadge count={savedCount} />
        ) : null}
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
  activeById,
  profileAuthState,
  showSaveBadge,
  savedCount,
  onNavClick,
}: {
  items: MobileBottomNavItem[];
  activeById: Record<MobileBottomNavItemId, boolean>;
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
      {items.map((item) => (
        <li key={item.id} className="mobile-bottom-nav__item-wrap">
          <BottomNavItemLink
            item={item}
            active={activeById[item.id]}
            profileAuthState={
              item.id === "profile" ? profileAuthState : undefined
            }
            showSaveBadge={showSaveBadge}
            savedCount={savedCount}
            onNavigate={(event) => onNavClick(item, event)}
          />
        </li>
      ))}
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
  const { isReady: savesReady, isSavesReady, savedCount } = useSavedTrainers();

  const profileAuthState = getMobileBottomNavProfileAuthState(
    clientReady,
    isReady,
    session
  );
  const showSaveBadge =
    clientReady && savesReady && isSavesReady && canSaveSpecialists(session) && savedCount > 0;
  const items = useMemo(
    () => getMobileBottomNavItems(session),
    [session]
  );

  const activeById = useMemo(() => {
    const map = {} as Record<MobileBottomNavItemId, boolean>;
    for (const item of items) {
      map[item.id] = isActiveNavItem(item.id, pathname, searchParams);
    }
    return map;
  }, [items, pathname, searchParams]);

  const handleNavClick = useCallback(
    (item: MobileBottomNavItem, event: MouseEvent<HTMLAnchorElement>) => {
      if (
        getBottomNavTransitionKind(item.id, pathname, searchParams, item.href) ===
        "none"
      ) {
        return;
      }

      const fromId =
        getActiveMobileBottomNavItemId(pathname, searchParams) ?? item.id;

      event.preventDefault();
      beginBottomNavTransition(item.href, { fromId, toId: item.id });
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
            activeById={activeById}
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
