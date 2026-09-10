"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { TapLink } from "@/components/ui/TapLink";
import {
  ChartIcon,
  HeartIcon,
  HomeIcon,
  SearchIcon,
  UserIcon,
} from "@/components/ui/icons";
import { useBeginBottomNavTransition } from "@/contexts/MobileBottomNavTransitionContext";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useMobileBottomNavProfilePhoto } from "@/hooks/useMobileBottomNavProfilePhoto";
import { useSavedTrainers } from "@/hooks/useSavedTrainers";
import { useStableClientState } from "@/hooks/useStableClientState";
import {
  getActiveMobileBottomNavItemId,
  getMobileBottomNavItems,
  getMobileBottomNavProfileAuthState,
  getMobileBottomNavProfilePresentation,
  isActiveNavItem,
  type MobileBottomNavItem,
  type MobileBottomNavItemId,
  type MobileBottomNavProfileAuthState,
  type MobileBottomNavProfilePresentation,
} from "@/lib/mobile-bottom-nav";
import {
  getBottomNavTransitionKind,
  isModifiedNavActivation,
} from "@/lib/mobile-bottom-nav-transition";
import { formatSavedCountBadge } from "@/lib/saved-ui";
import { canSaveSpecialists } from "@/lib/specialist-saves";
import { cn } from "@/lib/utils";

const NavIcon = memo(function NavIcon({
  id,
  active,
  savedCount,
  glyph,
}: {
  id: MobileBottomNavItemId;
  active: boolean;
  savedCount: number;
  glyph?: MobileBottomNavItem["glyph"];
}) {
  const className = cn(
    "mobile-bottom-nav__icon",
    active && "mobile-bottom-nav__icon--active",
    id === "saved" && savedCount > 0 && "mobile-bottom-nav__icon--has-saves",
    id === "profile" && "mobile-bottom-nav__icon--profile"
  );

  switch (id) {
    case "home":
      return <HomeIcon className={className} />;
    case "search":
      return <SearchIcon className={className} />;
    case "saved":
      if (glyph === "chart") {
        return <ChartIcon className={className} />;
      }
      return (
        <HeartIcon className={className} filled={active || savedCount > 0} />
      );
    case "profile":
      return <UserIcon className={className} />;
    default:
      return null;
  }
});

const ProfileNavAvatar = memo(function ProfileNavAvatar({
  presentation,
  active,
}: {
  presentation: MobileBottomNavProfilePresentation;
  active: boolean;
}) {
  const avatarUrl =
    presentation.kind === "avatar" ? presentation.avatarUrl : "";
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const showPhoto =
    presentation.kind === "avatar" &&
    Boolean(avatarUrl) &&
    failedUrl !== avatarUrl;

  if (presentation.kind === "avatar" || presentation.kind === "initials") {
    if (showPhoto) {
      return (
        // eslint-disable-next-line @next/next/no-img-element -- data URLs + arbitrary hosts for account avatars
        <img
          key={avatarUrl}
          src={avatarUrl}
          alt=""
          className={cn(
            "mobile-bottom-nav__avatar",
            active && "mobile-bottom-nav__avatar--active"
          )}
          draggable={false}
          decoding="async"
          onError={() => setFailedUrl(avatarUrl)}
        />
      );
    }

    return (
      <span
        className={cn(
          "mobile-bottom-nav__avatar-fallback",
          active && "mobile-bottom-nav__avatar-fallback--active"
        )}
        aria-hidden
      >
        {presentation.initials}
      </span>
    );
  }

  return (
    <UserIcon
      className={cn(
        "mobile-bottom-nav__icon mobile-bottom-nav__icon--profile",
        active && "mobile-bottom-nav__icon--active"
      )}
    />
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

const BottomNavItemLink = memo(function BottomNavItemLink({
  item,
  active,
  profileAuthState,
  profilePresentation,
  showSaveBadge,
  savedCount,
  onNavigate,
  onPointerDown,
  onPointerCommit,
  onPointerCancelActivate,
}: {
  item: MobileBottomNavItem;
  active: boolean;
  profileAuthState?: MobileBottomNavProfileAuthState;
  profilePresentation?: MobileBottomNavProfilePresentation;
  showSaveBadge: boolean;
  savedCount: number;
  onNavigate: (
    item: MobileBottomNavItem,
    event: MouseEvent<HTMLAnchorElement>
  ) => void;
  onPointerDown: (
    item: MobileBottomNavItem,
    event: PointerEvent<HTMLAnchorElement>
  ) => void;
  onPointerCommit: (
    item: MobileBottomNavItem,
    event: PointerEvent<HTMLAnchorElement>
  ) => void;
  onPointerCancelActivate: (item: MobileBottomNavItem) => void;
}) {
  const isProfile = item.id === "profile";
  const signedIn = profileAuthState === "signed-in";
  const hasAvatarChrome =
    signedIn &&
    profilePresentation &&
    (profilePresentation.kind === "avatar" ||
      profilePresentation.kind === "initials");

  const ariaLabel = isProfile
    ? signedIn
      ? "Open My Profile"
      : "Open Profile"
    : item.id === "saved" && item.href === "/saved" && showSaveBadge
      ? `${item.label}, ${savedCount} saved`
      : item.label;

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      onNavigate(item, event);
    },
    [item, onNavigate]
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLAnchorElement>) => {
      onPointerDown(item, event);
    },
    [item, onPointerDown]
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLAnchorElement>) => {
      onPointerCommit(item, event);
    },
    [item, onPointerCommit]
  );

  const handlePointerCancel = useCallback(() => {
    onPointerCancelActivate(item);
  }, [item, onPointerCancelActivate]);

  return (
    <TapLink
      href={item.href}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
      className={cn(
        "mobile-bottom-nav__item smoac-hit-target",
        item.isPrimary && "mobile-bottom-nav__item--primary",
        isProfile && "mobile-bottom-nav__item--profile",
        isProfile &&
          (signedIn
            ? "mobile-bottom-nav__item--profile-signed-in"
            : "mobile-bottom-nav__item--profile-signed-out"),
        hasAvatarChrome && "mobile-bottom-nav__item--profile-avatar",
        active && "mobile-bottom-nav__item--active"
      )}
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
      {...(isProfile ? { "data-profile-auth": profileAuthState } : {})}
    >
      <span
        className={cn(
          "mobile-bottom-nav__icon-shell",
          item.isPrimary && "mobile-bottom-nav__icon-shell--primary",
          isProfile && "mobile-bottom-nav__icon-shell--profile",
          hasAvatarChrome && "mobile-bottom-nav__icon-shell--avatar",
          active && "mobile-bottom-nav__icon-shell--active"
        )}
      >
        {isProfile && profilePresentation ? (
          <ProfileNavAvatar
            presentation={profilePresentation}
            active={active}
          />
        ) : (
          <NavIcon
            id={item.id}
            active={active}
            glyph={item.glyph}
            savedCount={
              item.id === "saved" &&
              item.href === "/saved" &&
              showSaveBadge
                ? savedCount
                : 0
            }
          />
        )}
        {item.id === "saved" && item.href === "/saved" && showSaveBadge ? (
          <SavedNavBadge count={savedCount} />
        ) : null}
      </span>
      <span
        className={cn(
          "mobile-bottom-nav__label",
          active && "mobile-bottom-nav__label--active"
        )}
      >
        {item.label}
      </span>
    </TapLink>
  );
});

const SiteNavPillItems = memo(function SiteNavPillItems({
  items,
  activeById,
  profileAuthState,
  profilePresentation,
  showSaveBadge,
  savedCount,
  onNavClick,
  onPointerDown,
  onPointerCommit,
  onPointerCancelActivate,
}: {
  items: MobileBottomNavItem[];
  activeById: Record<MobileBottomNavItemId, boolean>;
  profileAuthState: MobileBottomNavProfileAuthState;
  profilePresentation: MobileBottomNavProfilePresentation;
  showSaveBadge: boolean;
  savedCount: number;
  onNavClick: (
    item: MobileBottomNavItem,
    event: MouseEvent<HTMLAnchorElement>
  ) => void;
  onPointerDown: (
    item: MobileBottomNavItem,
    event: PointerEvent<HTMLAnchorElement>
  ) => void;
  onPointerCommit: (
    item: MobileBottomNavItem,
    event: PointerEvent<HTMLAnchorElement>
  ) => void;
  onPointerCancelActivate: (item: MobileBottomNavItem) => void;
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
            profilePresentation={
              item.id === "profile" ? profilePresentation : undefined
            }
            showSaveBadge={showSaveBadge}
            savedCount={savedCount}
            onNavigate={onNavClick}
            onPointerDown={onPointerDown}
            onPointerCommit={onPointerCommit}
            onPointerCancelActivate={onPointerCancelActivate}
          />
        </li>
      ))}
    </ul>
  );
});

function SiteNavPillShell({ className }: { className?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const beginBottomNavTransition = useBeginBottomNavTransition();
  const { clientReady } = useStableClientState();
  const { isReady, session } = useAuthSession();
  const specialistPhotoUrl = useMobileBottomNavProfilePhoto();
  const { isReady: savesReady, isSavesReady, savedCount } = useSavedTrainers();
  const [pendingId, setPendingId] = useState<MobileBottomNavItemId | null>(
    null
  );
  const startedByPointerRef = useRef<MobileBottomNavItemId | null>(null);

  const profileAuthState = getMobileBottomNavProfileAuthState(
    clientReady,
    isReady,
    session
  );
  const profilePresentation = useMemo(
    () =>
      getMobileBottomNavProfilePresentation(
        profileAuthState,
        session,
        specialistPhotoUrl
      ),
    [profileAuthState, session, specialistPhotoUrl]
  );
  const showSaveBadge =
    clientReady &&
    savesReady &&
    isSavesReady &&
    canSaveSpecialists(session) &&
    savedCount > 0;
  const items = useMemo(
    () => getMobileBottomNavItems(session),
    [session]
  );

  useEffect(() => {
    setPendingId(null);
    startedByPointerRef.current = null;
  }, [pathname, searchParams]);

  const activeById = useMemo(() => {
    const map = {} as Record<MobileBottomNavItemId, boolean>;
    for (const item of items) {
      map[item.id] =
        pendingId != null
          ? pendingId === item.id
          : isActiveNavItem(item.id, pathname, searchParams);
    }
    return map;
  }, [items, pathname, pendingId, searchParams]);

  const prefetchHref = useCallback(
    (href: string) => {
      try {
        router.prefetch(href);
      } catch {
        /* best-effort */
      }
    },
    [router]
  );

  const activateItem = useCallback(
    (
      item: MobileBottomNavItem,
      event: MouseEvent<HTMLAnchorElement> | PointerEvent<HTMLAnchorElement>
    ) => {
      if (isModifiedNavActivation(event)) return false;

      if (
        getBottomNavTransitionKind(
          item.id,
          pathname,
          searchParams,
          item.href
        ) === "none"
      ) {
        event.preventDefault();
        setPendingId(null);
        return true;
      }

      const fromId =
        getActiveMobileBottomNavItemId(pathname, searchParams) ?? item.id;

      event.preventDefault();
      setPendingId(item.id);
      beginBottomNavTransition(item.href, { fromId, toId: item.id });
      return true;
    },
    [beginBottomNavTransition, pathname, searchParams]
  );

  const handlePointerDown = useCallback(
    (
      item: MobileBottomNavItem,
      event: PointerEvent<HTMLAnchorElement>
    ) => {
      if (isModifiedNavActivation(event)) return;
      prefetchHref(item.href);
      if (event.pointerType === "mouse") return;
      setPendingId(item.id);
    },
    [prefetchHref]
  );

  const handlePointerCommit = useCallback(
    (
      item: MobileBottomNavItem,
      event: PointerEvent<HTMLAnchorElement>
    ) => {
      if (event.pointerType === "mouse") return;
      if (isModifiedNavActivation(event)) return;
      startedByPointerRef.current = item.id;
      activateItem(item, event);
    },
    [activateItem]
  );

  const handlePointerCancelActivate = useCallback(
    (item: MobileBottomNavItem) => {
      if (startedByPointerRef.current === item.id) return;
      setPendingId((current) => (current === item.id ? null : current));
    },
    []
  );

  const handleNavClick = useCallback(
    (item: MobileBottomNavItem, event: MouseEvent<HTMLAnchorElement>) => {
      if (startedByPointerRef.current === item.id) {
        event.preventDefault();
        startedByPointerRef.current = null;
        return;
      }
      activateItem(item, event);
    },
    [activateItem]
  );

  return (
    <div className={cn("mobile-bottom-nav__pill", className)}>
      <div className="mobile-bottom-nav__aurora" aria-hidden />
      <div className="mobile-bottom-nav__sheen" aria-hidden />

      <SiteNavPillItems
        items={items}
        activeById={activeById}
        profileAuthState={profileAuthState}
        profilePresentation={profilePresentation}
        showSaveBadge={showSaveBadge}
        savedCount={savedCount}
        onNavClick={handleNavClick}
        onPointerDown={handlePointerDown}
        onPointerCommit={handlePointerCommit}
        onPointerCancelActivate={handlePointerCancelActivate}
      />
    </div>
  );
}

export const SiteNavPill = memo(SiteNavPillShell);
