"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useSyncExternalStore } from "react";
import {
  SmoacDirectoryLoader,
  type SmoacDirectoryLoaderPhase,
} from "@/components/brand/SmoacDirectoryLoader";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  getActiveMobileBottomNavItemId,
  type MobileBottomNavItemId,
} from "@/lib/mobile-bottom-nav";
import {
  BOTTOM_NAV_DIRECTORY_OUT_MS,
  BOTTOM_NAV_DIRECTORY_TOTAL_MS,
  BOTTOM_NAV_PANEL_MS,
  BOTTOM_NAV_PANEL_REDUCED_MS,
  getBottomNavPanelDirection,
  getBottomNavRouteKey,
  parseBottomNavHref,
  type BottomNavPanelDirection,
  type BottomNavTransitionKind,
} from "@/lib/mobile-bottom-nav-transition";
import {
  getTabletMaxWidthSnapshot,
  subscribeTabletMaxWidth,
} from "@/lib/viewport";

export interface BottomNavPanelTransitionState {
  active: boolean;
  direction: BottomNavPanelDirection;
  /** Unique key for AnimatePresence — bumps each transition */
  motionKey: string;
  /** After directory loader — enter only, no outgoing layer */
  enterOnly: boolean;
}

interface BeginBottomNavTransitionOptions {
  fromId: MobileBottomNavItemId;
  toId: MobileBottomNavItemId;
}

interface MobileBottomNavTransitionContextValue {
  isTransitioning: boolean;
  isDirectoryLoading: boolean;
  panel: BottomNavPanelTransitionState;
  beginBottomNavTransition: (
    href: string,
    kind: Exclude<BottomNavTransitionKind, "none">,
    options: BeginBottomNavTransitionOptions
  ) => void;
  completePanelTransition: () => void;
}

const INACTIVE_PANEL: BottomNavPanelTransitionState = {
  active: false,
  direction: 1,
  motionKey: "",
  enterOnly: false,
};

const MobileBottomNavTransitionContext =
  createContext<MobileBottomNavTransitionContextValue | null>(null);

const BODY_DIRECTORY_ATTR = "data-bottom-nav-transition";

const DIRECTORY_REDUCED_TOTAL_MS = 720;
const DIRECTORY_REDUCED_OUT_MS = 180;

const scrollPositions = new Map<string, number>();

function getIsTabletSnapshot(): boolean {
  return getTabletMaxWidthSnapshot();
}

function getIsTabletServerSnapshot(): boolean {
  return false;
}

function setDirectoryBodyActive(active: boolean): void {
  if (active) {
    document.body.setAttribute(BODY_DIRECTORY_ATTR, "directory");
    document.documentElement.setAttribute(BODY_DIRECTORY_ATTR, "directory");
    document.body.classList.add("bottom-nav-directory-active");
    document.documentElement.classList.add("bottom-nav-directory-active");
  } else {
    document.body.removeAttribute(BODY_DIRECTORY_ATTR);
    document.documentElement.removeAttribute(BODY_DIRECTORY_ATTR);
    document.body.classList.remove("bottom-nav-directory-active");
    document.documentElement.classList.remove("bottom-nav-directory-active");
  }
}

function setPanelBodyActive(active: boolean): void {
  document.body.classList.toggle("bottom-nav-panel-active", active);
  document.documentElement.classList.toggle("bottom-nav-panel-active", active);
}

function saveScrollForKey(key: string): void {
  scrollPositions.set(key, window.scrollY);
}

function restoreScrollForKey(key: string): void {
  const y = scrollPositions.get(key);
  if (y === undefined) return;
  requestAnimationFrame(() => {
    window.scrollTo(0, y);
  });
}

export function MobileBottomNavTransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const reducedMotion = usePrefersReducedMotion();
  const isTabletViewport = useSyncExternalStore(
    subscribeTabletMaxWidth,
    getIsTabletSnapshot,
    getIsTabletServerSnapshot
  );
  const [mounted, setMounted] = useState(false);
  const [showDirectoryOverlay, setShowDirectoryOverlay] = useState(false);
  const [directoryLoaderPhase, setDirectoryLoaderPhase] =
    useState<SmoacDirectoryLoaderPhase>("exit");
  const [panel, setPanel] = useState<BottomNavPanelTransitionState>(INACTIVE_PANEL);
  const [isLocked, setIsLocked] = useState(false);
  const lockRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const motionKeyRef = useRef(0);
  const pendingTargetScrollKeyRef = useRef<string | null>(null);
  const pendingPanelRef = useRef<{
    href: string;
    direction: BottomNavPanelDirection;
    enterOnly: boolean;
  } | null>(null);
  const panelCompleteGuardRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay);
    timersRef.current.push(id);
  }, []);

  const releaseLock = useCallback(() => {
    clearTimers();
    lockRef.current = false;
    setIsLocked(false);
    setPanelBodyActive(false);
    pendingTargetScrollKeyRef.current = null;
  }, [clearTimers]);

  const completePanelTransition = useCallback(() => {
    if (panelCompleteGuardRef.current) return;
    panelCompleteGuardRef.current = true;

    const targetKey = pendingTargetScrollKeyRef.current;
    setPanel(INACTIVE_PANEL);
    releaseLock();
    if (targetKey) restoreScrollForKey(targetKey);

    requestAnimationFrame(() => {
      panelCompleteGuardRef.current = false;
    });
  }, [releaseLock]);

  const activatePanel = useCallback(
    (
      href: string,
      direction: BottomNavPanelDirection,
      enterOnly: boolean
    ) => {
      const target = parseBottomNavHref(href);
      const targetScrollKey = getBottomNavRouteKey(target.pathname, target.search);
      pendingTargetScrollKeyRef.current = targetScrollKey;
      pendingPanelRef.current = null;

      motionKeyRef.current += 1;
      setPanelBodyActive(true);
      setPanel({
        active: true,
        direction,
        motionKey: `${targetScrollKey}::${motionKeyRef.current}`,
        enterOnly,
      });
    },
    []
  );

  useEffect(() => {
    const pending = pendingPanelRef.current;
    if (!pending || !lockRef.current) return;

    const target = parseBottomNavHref(pending.href);
    const currentSearch =
      typeof window !== "undefined" ? window.location.search : "";
    const currentKey = getBottomNavRouteKey(pathname, currentSearch);
    const targetKey = getBottomNavRouteKey(target.pathname, target.search);
    if (currentKey !== targetKey) return;

    activatePanel(pending.href, pending.direction, pending.enterOnly);
  }, [activatePanel, pathname]);

  const runPanelTransition = useCallback(
    (href: string, options: BeginBottomNavTransitionOptions) => {
      const direction = getBottomNavPanelDirection(
        options.fromId,
        options.toId
      );
      const currentSearch =
        typeof window !== "undefined" ? window.location.search : "";
      const fromScrollKey = getBottomNavRouteKey(pathname, currentSearch);
      saveScrollForKey(fromScrollKey);

      pendingPanelRef.current = { href, direction, enterOnly: false };
      router.push(href);

      const panelMs = reducedMotion
        ? BOTTOM_NAV_PANEL_REDUCED_MS
        : BOTTOM_NAV_PANEL_MS;
      schedule(completePanelTransition, panelMs + 80);
    },
    [
      completePanelTransition,
      pathname,
      reducedMotion,
      router,
      schedule,
    ]
  );

  const runDirectoryTransition = useCallback(
    (href: string) => {
      const totalMs = reducedMotion
        ? DIRECTORY_REDUCED_TOTAL_MS
        : BOTTOM_NAV_DIRECTORY_TOTAL_MS;
      const outMs = reducedMotion
        ? DIRECTORY_REDUCED_OUT_MS
        : BOTTOM_NAV_DIRECTORY_OUT_MS;
      const panelMs = reducedMotion
        ? BOTTOM_NAV_PANEL_REDUCED_MS
        : BOTTOM_NAV_PANEL_MS;

      const currentSearch =
        typeof window !== "undefined" ? window.location.search : "";
      saveScrollForKey(getBottomNavRouteKey(pathname, currentSearch));

      setDirectoryBodyActive(true);
      setShowDirectoryOverlay(true);
      setDirectoryLoaderPhase("active");

      router.push(href);

      schedule(() => {
        setDirectoryLoaderPhase("exit");
      }, totalMs - outMs);

      schedule(() => {
        setShowDirectoryOverlay(false);
        setDirectoryBodyActive(false);
        activatePanel(href, 1, true);
      }, totalMs);

      schedule(completePanelTransition, totalMs + panelMs + 80);
    },
    [
      completePanelTransition,
      pathname,
      reducedMotion,
      router,
      schedule,
      activatePanel,
    ]
  );

  const beginBottomNavTransition = useCallback(
    (
      href: string,
      kind: Exclude<BottomNavTransitionKind, "none">,
      options: BeginBottomNavTransitionOptions
    ) => {
      if (lockRef.current) return;

      if (!isTabletViewport) {
        router.push(href);
        return;
      }

      lockRef.current = true;
      setIsLocked(true);
      clearTimers();

      if (kind === "directory") {
        runDirectoryTransition(href);
        return;
      }

      runPanelTransition(href, options);
    },
    [
      clearTimers,
      isTabletViewport,
      router,
      runDirectoryTransition,
      runPanelTransition,
    ]
  );

  useEffect(() => clearTimers, [clearTimers]);

  const value: MobileBottomNavTransitionContextValue = {
    isTransitioning: isLocked || panel.active || showDirectoryOverlay,
    isDirectoryLoading: showDirectoryOverlay,
    panel,
    beginBottomNavTransition,
    completePanelTransition,
  };

  return (
    <MobileBottomNavTransitionContext.Provider value={value}>
      {children}
      {mounted && typeof document !== "undefined"
        ? createPortal(
            showDirectoryOverlay ? (
              <div
                className="bottom-nav-transition-overlay bottom-nav-transition-overlay--directory"
                role="presentation"
                aria-hidden={directoryLoaderPhase === "exit"}
              >
                <SmoacDirectoryLoader phase={directoryLoaderPhase} />
              </div>
            ) : null,
            document.body
          )
        : null}
    </MobileBottomNavTransitionContext.Provider>
  );
}

export function useMobileBottomNavTransition(): MobileBottomNavTransitionContextValue {
  const ctx = useContext(MobileBottomNavTransitionContext);
  if (!ctx) {
    throw new Error(
      "useMobileBottomNavTransition must be used within MobileBottomNavTransitionProvider"
    );
  }
  return ctx;
}

export function useBottomNavPanelTransition(): BottomNavPanelTransitionState {
  const ctx = useContext(MobileBottomNavTransitionContext);
  return ctx?.panel ?? INACTIVE_PANEL;
}

export function useBottomNavDirectoryLoading(): boolean {
  const ctx = useContext(MobileBottomNavTransitionContext);
  return ctx?.isDirectoryLoading ?? false;
}

export function useCompleteBottomNavPanelTransition(): () => void {
  const ctx = useContext(MobileBottomNavTransitionContext);
  return ctx?.completePanelTransition ?? (() => {});
}
