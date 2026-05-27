"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { TapLink } from "@/components/ui/TapLink";
import {
  CompassIcon,
  HeartIcon,
  HomeIcon,
  SearchIcon,
  UserIcon,
} from "@/components/ui/icons";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useMobileBottomNavHidden } from "@/hooks/useMobileBottomNavHidden";
import { useSavedTrainers } from "@/hooks/useSavedTrainers";
import { useStableClientState } from "@/hooks/useStableClientState";
import {
  getMobileBottomNavItems,
  isMobileBottomNavItemActive,
  type MobileBottomNavItemId,
} from "@/lib/mobile-bottom-nav";
import { formatSavedCountBadge } from "@/lib/saved-ui";
import { canSaveSpecialists, isLoggedIn } from "@/lib/specialist-saves";
import {
  getTabletMaxWidthSnapshot,
  subscribeTabletMaxWidth,
} from "@/lib/viewport";
import { cn } from "@/lib/utils";

function getIsTabletSnapshot(): boolean {
  return getTabletMaxWidthSnapshot();
}

function getIsTabletServerSnapshot(): boolean {
  return false;
}

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
    id === "saved" &&
      savedCount > 0 &&
      "mobile-bottom-nav__icon--has-saves"
  );

  switch (id) {
    case "search":
      return <SearchIcon className={className} />;
    case "saved":
      return (
        <HeartIcon
          className={className}
          filled={active || savedCount > 0}
        />
      );
    case "home":
      return <HomeIcon className={className} />;
    case "discover":
      return <CompassIcon className={className} />;
    case "profile":
      return <UserIcon className={className} />;
    default:
      return null;
  }
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const hidden = useMobileBottomNavHidden();
  const isTabletViewport = useSyncExternalStore(
    subscribeTabletMaxWidth,
    getIsTabletSnapshot,
    getIsTabletServerSnapshot
  );
  const { clientReady } = useStableClientState();
  const { isReady, session } = useAuthSession();
  const { isReady: savesReady, savedCount } = useSavedTrainers();

  const signedIn = clientReady && isReady && isLoggedIn(session);
  const showSaveBadge =
    clientReady &&
    savesReady &&
    canSaveSpecialists(session) &&
    savedCount > 0;
  const saveBadgeLabel = formatSavedCountBadge(savedCount);
  const items = getMobileBottomNavItems(session);

  if (!isTabletViewport) return null;

  return (
    <nav
      className={cn(
        "mobile-bottom-nav",
        hidden && "mobile-bottom-nav--hidden"
      )}
      aria-label="Mobile navigation"
      aria-hidden={hidden}
    >
      <div className="mobile-bottom-nav__scrim" aria-hidden />

      <div className="mobile-bottom-nav__float">
        <div className="mobile-bottom-nav__pill">
          <div className="mobile-bottom-nav__aurora" aria-hidden />
          <div className="mobile-bottom-nav__sheen" aria-hidden />

          <ul className="mobile-bottom-nav__list">
            {items.map((item) => {
              const active = isMobileBottomNavItemActive(item.id, pathname);
              const isProfile = item.id === "profile";

              return (
                <li key={item.id} className="mobile-bottom-nav__item-wrap">
                  <TapLink
                    href={item.href}
                    className={cn(
                      "mobile-bottom-nav__item smoac-hit-target",
                      item.isPrimary && "mobile-bottom-nav__item--primary",
                      active && "mobile-bottom-nav__item--active",
                      isProfile &&
                        signedIn &&
                        "mobile-bottom-nav__item--signed-in",
                      isProfile && active && signedIn && "mobile-bottom-nav__item--profile-active"
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
                        <span
                          className="mobile-bottom-nav__badge"
                          aria-hidden
                        >
                          {saveBadgeLabel}
                        </span>
                      ) : null}
                      {isProfile && signedIn ? (
                        <span
                          className="mobile-bottom-nav__profile-glow"
                          aria-hidden
                        />
                      ) : null}
                    </span>
                  </TapLink>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
