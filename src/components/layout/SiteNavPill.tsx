"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  memo,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { TapLink } from "@/components/ui/TapLink";
import {
  ChartIcon,
  DumbbellIcon,
  HeartIcon,
  HomeIcon,
  SearchIcon,
  UserIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { useBeginBottomNavTransition } from "@/contexts/MobileBottomNavTransitionContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useClientNavAttention } from "@/hooks/useClientNavAttention";
import { useWorkoutNavAttention } from "@/hooks/useWorkoutNavAttention";
import { useMobileBottomNavProfilePhoto } from "@/hooks/useMobileBottomNavProfilePhoto";
import { useSavedTrainers } from "@/hooks/useSavedTrainers";
import { useStableClientState } from "@/hooks/useStableClientState";
import {
  getActiveMobileBottomNavItemId,
  getMobileBottomNavItems,
  getMobileBottomNavProfileAuthState,
  getMobileBottomNavProfilePresentation,
  isActiveNavItem,
  isSpecialistDashboardClientsTab,
  isWorkoutsNavPath,
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
    case "clients":
      return <UsersIcon className={className} />;
    case "saved":
      if (glyph === "chart") {
        return <ChartIcon className={className} />;
      }
      if (glyph === "dumbbell") {
        return <DumbbellIcon className={className} />;
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

type TabGlassBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Survives a tab-change remount so the glass can travel from the previous tab. */
let lastNativeTabGlass: {
  id: MobileBottomNavItemId;
  box: TabGlassBox;
} | null = null;

/** Frosted capsule padding around the glyph and its label. */
const TAB_GLASS_PAD_X = 12;
const TAB_GLASS_PAD_TOP = 10;
const TAB_GLASS_PAD_BOTTOM = 7;

function measureActiveTab(
  list: HTMLElement,
  activeId: MobileBottomNavItemId
): TabGlassBox | null {
  const item = list.querySelector<HTMLElement>(`[data-nav-id="${activeId}"]`);
  if (!item) return null;
  const glyph = item.querySelector<HTMLElement>(
    ".mobile-bottom-nav__icon, .mobile-bottom-nav__avatar, .mobile-bottom-nav__avatar-fallback"
  );
  const label = item.querySelector<HTMLElement>(".mobile-bottom-nav__label");
  const listBox = list.getBoundingClientRect();
  const anchor = glyph ?? item;
  const anchorBox = anchor.getBoundingClientRect();
  const labelBox = label?.getBoundingClientRect();
  const top = anchorBox.top - TAB_GLASS_PAD_TOP;
  const bottom =
    Math.max(anchorBox.bottom, labelBox?.bottom ?? anchorBox.bottom) +
    TAB_GLASS_PAD_BOTTOM;
  const left =
    Math.min(anchorBox.left, labelBox?.left ?? anchorBox.left) -
    TAB_GLASS_PAD_X;
  const right =
    Math.max(anchorBox.right, labelBox?.right ?? anchorBox.right) +
    TAB_GLASS_PAD_X;
  if (right - left < 1 || bottom - top < 1) return null;
  return {
    left: left - listBox.left,
    top: top - listBox.top,
    width: right - left,
    height: bottom - top,
  };
}

function paintTabGlass(glass: HTMLElement, box: TabGlassBox) {
  glass.style.left = `${box.left}px`;
  glass.style.top = `${box.top}px`;
  glass.style.width = `${box.width}px`;
  glass.style.height = `${box.height}px`;
}

/** Shrink in place, travel, then open on the next tab with a small overshoot. */
function playTabGlassBounce(
  glass: HTMLElement,
  from: TabGlassBox,
  to: TabGlassBox
) {
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  glass.getAnimations().forEach((animation) => animation.cancel());
  paintTabGlass(glass, to);
  glass.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(1)` },
      {
        transform: `translate(${dx}px, ${dy}px) scale(0.78)`,
        offset: 0.28,
      },
      { transform: "translate(0, 0) scale(0.78)", offset: 0.56 },
      { transform: "translate(0, 0) scale(1.06)", offset: 0.8 },
      { transform: "translate(0, 0) scale(1)" },
    ],
    { duration: 480, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
  );
}

const NativeTabSelection = memo(function NativeTabSelection({
  activeId,
  layoutKey,
  settled,
}: {
  activeId: MobileBottomNavItemId | null;
  /** Tab set. Changes when the specialist bar replaces the signed-out bar. */
  layoutKey: string;
  /** Auth has finished hydrating, so the tab set will not jump again. */
  settled: boolean;
}) {
  const glassRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const syncGlass = useCallback(
    (animate: boolean) => {
      const glass = glassRef.current;
      const list = glass?.parentElement;
      if (!glass || !list || !activeId) return;
      if (!settled) {
        glass.classList.remove("is-ready");
        return;
      }

      const next = measureActiveTab(list, activeId);
      if (!next || next.width < 1) return;

      const running = glass
        .getAnimations()
        .some((animation) => animation.playState === "running");
      let from =
        lastNativeTabGlass && lastNativeTabGlass.id !== activeId
          ? lastNativeTabGlass.box
          : null;
      if (running) {
        const listBox = list.getBoundingClientRect();
        const live = glass.getBoundingClientRect();
        from = {
          left: live.left - listBox.left,
          top: live.top - listBox.top,
          width: live.width,
          height: live.height,
        };
        glass.getAnimations().forEach((animation) => animation.cancel());
      }

      lastNativeTabGlass = { id: activeId, box: next };
      glass.classList.add("is-ready");

      const moved =
        from != null &&
        (Math.abs(from.left - next.left) > 1 ||
          Math.abs(from.top - next.top) > 1);

      if (!animate || reducedMotion || !moved || !from) {
        glass.getAnimations().forEach((animation) => animation.cancel());
        glass.style.transform = "translate(0, 0) scale(1)";
        paintTabGlass(glass, next);
        return;
      }

      playTabGlassBounce(glass, from, next);
    },
    [activeId, reducedMotion, settled]
  );

  useLayoutEffect(() => {
    syncGlass(true);
  }, [syncGlass, layoutKey]);

  useEffect(() => {
    const list = glassRef.current?.parentElement;
    if (!list || !settled) return;

    const measure = () => {
      const glass = glassRef.current;
      if (glass?.getAnimations().some((animation) => animation.playState === "running")) {
        return;
      }
      syncGlass(false);
    };

    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(list);
    const item = activeId
      ? list.querySelector<HTMLElement>(`[data-nav-id="${activeId}"]`)
      : null;
    if (item) {
      observer?.observe(item);
      const glyph = item.querySelector<HTMLElement>(
        ".mobile-bottom-nav__icon, .mobile-bottom-nav__avatar, .mobile-bottom-nav__avatar-fallback"
      );
      if (glyph) observer?.observe(glyph);
    }

    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });
    window.addEventListener("resize", measure);

    return () => {
      cancelled = true;
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [activeId, layoutKey, settled, syncGlass]);

  return (
    <span
      ref={glassRef}
      className="mobile-bottom-nav__selection"
      aria-hidden
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
  clientAttentionCount,
  workoutAlertCount,
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
  clientAttentionCount: number;
  workoutAlertCount: number;
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
    : item.id === "clients" && clientAttentionCount > 0
      ? `Clients, ${clientAttentionCount} new`
      : item.id === "saved" && item.href === "/saved" && showSaveBadge
        ? `${item.label}, ${savedCount} saved`
        : item.glyph === "dumbbell" && workoutAlertCount > 0
          ? `Workouts, ${workoutAlertCount} new`
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
      data-nav-id={item.id}
      data-tour={
        item.id === "clients"
          ? "clients-tab"
          : item.id === "saved" && item.label === "Overview"
            ? "overview-tab"
            : undefined
      }
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
        {item.glyph === "dumbbell" && workoutAlertCount > 0 ? (
          <span className="mobile-bottom-nav__badge mobile-bottom-nav__badge--alert" aria-hidden>
            {workoutAlertCount > 9 ? "9+" : workoutAlertCount}
          </span>
        ) : null}
        {item.id === "clients" && clientAttentionCount > 0 ? (
          <span className="mobile-bottom-nav__badge mobile-bottom-nav__badge--clients" aria-hidden>
            {clientAttentionCount > 9 ? "9+" : clientAttentionCount}
          </span>
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
  activeId,
  activeById,
  profileAuthState,
  profilePresentation,
  showSaveBadge,
  savedCount,
  clientAttentionCount,
  workoutAlertCount,
  layoutKey,
  settled,
  onNavClick,
  onPointerDown,
  onPointerCommit,
  onPointerCancelActivate,
}: {
  items: MobileBottomNavItem[];
  activeId: MobileBottomNavItemId | null;
  activeById: Record<MobileBottomNavItemId, boolean>;
  profileAuthState: MobileBottomNavProfileAuthState;
  profilePresentation: MobileBottomNavProfilePresentation;
  showSaveBadge: boolean;
  savedCount: number;
  clientAttentionCount: number;
  workoutAlertCount: number;
  layoutKey: string;
  settled: boolean;
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
      <NativeTabSelection
        activeId={activeId}
        layoutKey={layoutKey}
        settled={settled}
      />
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
            clientAttentionCount={clientAttentionCount}
            workoutAlertCount={workoutAlertCount}
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

function SiteNavPillShell({
  className,
  searchParams,
}: {
  className?: string;
  searchParams: URLSearchParams | null;
}) {
  const pathname = usePathname();
  const routeSearch = searchParams ?? new URLSearchParams();
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
  const viewingClients = isSpecialistDashboardClientsTab(pathname, routeSearch);
  const clientAttention =
    useClientNavAttention(viewingClients);
  const clientAttentionCount = pendingId === "clients" ? 0 : clientAttention;
  const viewingWorkouts = isWorkoutsNavPath(pathname);
  const unseenWorkouts = useWorkoutNavAttention(viewingWorkouts);
  const workoutAlertCount =
    clientReady && unseenWorkouts > 0 && pendingId !== "saved" ? unseenWorkouts : 0;
  const items = useMemo(
    () => getMobileBottomNavItems(session),
    [session]
  );

  useEffect(() => {
    setPendingId(null);
    startedByPointerRef.current = null;
  }, [pathname, routeSearch]);

  const activeId =
    items.find((item) =>
      pendingId != null
        ? pendingId === item.id
        : isActiveNavItem(item.id, pathname, routeSearch)
    )?.id ?? null;

  const activeById = useMemo(() => {
    const map = {} as Record<MobileBottomNavItemId, boolean>;
    for (const item of items) {
      map[item.id] =
        pendingId != null
          ? pendingId === item.id
          : isActiveNavItem(item.id, pathname, routeSearch);
    }
    return map;
  }, [items, pathname, pendingId, routeSearch]);

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
          routeSearch,
          item.href
        ) === "none"
      ) {
        event.preventDefault();
        setPendingId(null);
        return true;
      }

      const fromId =
        getActiveMobileBottomNavItemId(pathname, routeSearch) ?? item.id;

      event.preventDefault();
      setPendingId(item.id);
      beginBottomNavTransition(item.href, { fromId, toId: item.id });
      return true;
    },
    [beginBottomNavTransition, pathname, routeSearch]
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
        activeId={activeId}
        activeById={activeById}
        profileAuthState={profileAuthState}
        profilePresentation={profilePresentation}
        showSaveBadge={showSaveBadge}
        savedCount={savedCount}
        clientAttentionCount={clientAttentionCount}
        workoutAlertCount={workoutAlertCount}
        layoutKey={items.map((item) => item.id).join("|")}
        settled={clientReady && isReady}
        onNavClick={handleNavClick}
        onPointerDown={handlePointerDown}
        onPointerCommit={handlePointerCommit}
        onPointerCancelActivate={handlePointerCancelActivate}
      />
    </div>
  );
}

function SiteNavPillFromRoute({ className }: { className?: string }) {
  const searchParams = useSearchParams();
  return <SiteNavPillShell className={className} searchParams={searchParams} />;
}

function SiteNavPillGate({ className }: { className?: string }) {
  return (
    <Suspense fallback={<SiteNavPillShell className={className} searchParams={null} />}>
      <SiteNavPillFromRoute className={className} />
    </Suspense>
  );
}

export const SiteNavPill = memo(SiteNavPillGate);
