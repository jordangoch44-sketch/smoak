"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { SmoacDirectoryLoaderPhase } from "@/components/brand/SmoacDirectoryLoader";
import { useMobileMotionProfile } from "@/hooks/useMobileMotionProfile";
import { useTabletViewport } from "@/hooks/useTabletViewport";
import { prefetchBottomNavRoutes } from "@/lib/bottom-nav-prefetch";
import type { MobileBottomNavItemId } from "@/lib/mobile-bottom-nav";
import {
  getClientRouteSearch,
  restoreBottomNavScroll,
  saveBottomNavScroll,
  setBottomNavDirectoryBodyActive,
  setBottomNavPanelBodyActive,
} from "@/lib/mobile-chrome";
import {
  BOTTOM_NAV_DIRECTORY_OUT_MS,
  BOTTOM_NAV_DIRECTORY_REDUCED_OUT_MS,
  BOTTOM_NAV_DIRECTORY_REDUCED_TOTAL_MS,
  BOTTOM_NAV_DIRECTORY_TOTAL_MS,
  BOTTOM_NAV_PANEL_MS,
  BOTTOM_NAV_PANEL_REDUCED_MS,
  BOTTOM_NAV_PANEL_TOUCH_MS,
  getBottomNavPanelDirection,
  getBottomNavRouteKey,
  parseBottomNavHref,
  type BottomNavPanelDirection,
  type BottomNavTransitionKind,
} from "@/lib/mobile-bottom-nav-transition";

const SmoacDirectoryLoader = dynamic(
  () =>
    import("@/components/brand/SmoacDirectoryLoader").then(
      (mod) => mod.SmoacDirectoryLoader
    ),
  { ssr: false }
);

export interface BottomNavPanelTransitionState {
  active: boolean;
  direction: BottomNavPanelDirection;
  motionKey: string;
  /** Skip exit animation — used after interrupting a in-flight transition */
  enterOnly: boolean;
}

interface BeginBottomNavTransitionOptions {
  fromId: MobileBottomNavItemId;
  toId: MobileBottomNavItemId;
}

interface BottomNavTransitionActions {
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

const BottomNavPanelContext =
  createContext<BottomNavPanelTransitionState>(INACTIVE_PANEL);

const BottomNavTransitionActionsContext =
  createContext<BottomNavTransitionActions | null>(null);

function subscribeClientMounted(): () => void {
  return () => {};
}

function getClientMountedSnapshot(): boolean {
  return true;
}

function getClientMountedServerSnapshot(): boolean {
  return false;
}

export function MobileBottomNavTransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { reducedMotion, fastMotion } = useMobileMotionProfile();
  const isTabletViewport = useTabletViewport();
  const mounted = useSyncExternalStore(
    subscribeClientMounted,
    getClientMountedSnapshot,
    getClientMountedServerSnapshot
  );
  const [showDirectoryOverlay, setShowDirectoryOverlay] = useState(false);
  const [directoryLoaderPhase, setDirectoryLoaderPhase] =
    useState<SmoacDirectoryLoaderPhase>("exit");
  const [panel, setPanel] = useState<BottomNavPanelTransitionState>(INACTIVE_PANEL);
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
  const didPrefetchRef = useRef(false);

  const panelMs = reducedMotion
    ? BOTTOM_NAV_PANEL_REDUCED_MS
    : fastMotion
      ? BOTTOM_NAV_PANEL_TOUCH_MS
      : BOTTOM_NAV_PANEL_MS;

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
    setBottomNavPanelBodyActive(false);
    pendingTargetScrollKeyRef.current = null;
  }, [clearTimers]);

  const flushTransition = useCallback(() => {
    clearTimers();
    setShowDirectoryOverlay(false);
    setDirectoryLoaderPhase("exit");
    setBottomNavDirectoryBodyActive(false);
    setPanel(INACTIVE_PANEL);
    pendingPanelRef.current = null;
    lockRef.current = false;
    setBottomNavPanelBodyActive(false);
    panelCompleteGuardRef.current = false;
  }, [clearTimers]);

  const completePanelTransition = useCallback(() => {
    if (panelCompleteGuardRef.current) return;
    panelCompleteGuardRef.current = true;

    const targetKey = pendingTargetScrollKeyRef.current;
    setPanel(INACTIVE_PANEL);
    releaseLock();
    if (targetKey) restoreBottomNavScroll(targetKey);

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
      setBottomNavPanelBodyActive(true);
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
    const currentKey = getBottomNavRouteKey(pathname, getClientRouteSearch());
    const targetKey = getBottomNavRouteKey(target.pathname, target.search);
    if (currentKey !== targetKey) return;

    activatePanel(pending.href, pending.direction, pending.enterOnly);
  }, [activatePanel, pathname]);

  const runPanelTransition = useCallback(
    (
      href: string,
      options: BeginBottomNavTransitionOptions,
      enterOnly: boolean
    ) => {
      const direction = getBottomNavPanelDirection(
        options.fromId,
        options.toId
      );
      saveBottomNavScroll(
        getBottomNavRouteKey(pathname, getClientRouteSearch())
      );

      pendingPanelRef.current = { href, direction, enterOnly };
      router.push(href);

      schedule(completePanelTransition, panelMs + 48);
    },
    [completePanelTransition, panelMs, pathname, router, schedule]
  );

  const runDirectoryTransition = useCallback(
    (href: string) => {
      const totalMs = reducedMotion
        ? BOTTOM_NAV_DIRECTORY_REDUCED_TOTAL_MS
        : BOTTOM_NAV_DIRECTORY_TOTAL_MS;
      const outMs = reducedMotion
        ? BOTTOM_NAV_DIRECTORY_REDUCED_OUT_MS
        : BOTTOM_NAV_DIRECTORY_OUT_MS;

      saveBottomNavScroll(
        getBottomNavRouteKey(pathname, getClientRouteSearch())
      );

      setBottomNavDirectoryBodyActive(true);
      setShowDirectoryOverlay(true);
      setDirectoryLoaderPhase("active");
      router.push(href);

      schedule(() => setDirectoryLoaderPhase("exit"), totalMs - outMs);

      schedule(() => {
        setShowDirectoryOverlay(false);
        setBottomNavDirectoryBodyActive(false);
        activatePanel(href, 1, true);
      }, totalMs);

      schedule(completePanelTransition, totalMs + panelMs + 48);
    },
    [
      activatePanel,
      completePanelTransition,
      panelMs,
      pathname,
      reducedMotion,
      router,
      schedule,
    ]
  );

  const beginBottomNavTransition = useCallback(
    (
      href: string,
      kind: Exclude<BottomNavTransitionKind, "none">,
      options: BeginBottomNavTransitionOptions
    ) => {
      if (!isTabletViewport) {
        router.push(href);
        return;
      }

      const interrupted = lockRef.current;
      if (interrupted) {
        flushTransition();
      }

      lockRef.current = true;
      clearTimers();

      if (kind === "directory") {
        runDirectoryTransition(href);
        return;
      }

      runPanelTransition(href, options, interrupted);
    },
    [
      clearTimers,
      flushTransition,
      isTabletViewport,
      router,
      runDirectoryTransition,
      runPanelTransition,
    ]
  );

  useEffect(() => clearTimers, [clearTimers]);

  useEffect(() => {
    if (!isTabletViewport || didPrefetchRef.current) return;
    didPrefetchRef.current = true;

    const runPrefetch = () => prefetchBottomNavRoutes(router.prefetch);

    const scheduleIdle = window.requestIdleCallback;
    if (typeof scheduleIdle === "function") {
      const id = scheduleIdle(runPrefetch, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }

    const id = window.setTimeout(runPrefetch, 1200);
    return () => window.clearTimeout(id);
  }, [isTabletViewport, router]);

  const actions = useMemo<BottomNavTransitionActions>(
    () => ({
      beginBottomNavTransition,
      completePanelTransition,
    }),
    [beginBottomNavTransition, completePanelTransition]
  );

  return (
    <BottomNavTransitionActionsContext.Provider value={actions}>
      <BottomNavPanelContext.Provider value={panel}>
        {children}
        {mounted && showDirectoryOverlay
          ? createPortal(
              <div
                className="bottom-nav-transition-overlay bottom-nav-transition-overlay--directory"
                role="presentation"
                aria-hidden={directoryLoaderPhase === "exit"}
              >
                <SmoacDirectoryLoader
                  phase={directoryLoaderPhase}
                  reducedMotion={reducedMotion}
                />
              </div>,
              document.body
            )
          : null}
      </BottomNavPanelContext.Provider>
    </BottomNavTransitionActionsContext.Provider>
  );
}

export function useBottomNavTransitionActions(): BottomNavTransitionActions {
  const ctx = useContext(BottomNavTransitionActionsContext);
  if (!ctx) {
    throw new Error(
      "useBottomNavTransitionActions must be used within MobileBottomNavTransitionProvider"
    );
  }
  return ctx;
}

/** Stable actions only — bottom nav should use this to avoid panel-state re-renders */
export function useBeginBottomNavTransition(): BottomNavTransitionActions["beginBottomNavTransition"] {
  return useBottomNavTransitionActions().beginBottomNavTransition;
}

export function useCompleteBottomNavPanelTransition(): BottomNavTransitionActions["completePanelTransition"] {
  return useBottomNavTransitionActions().completePanelTransition;
}

/** Panel state for PageTransition */
export function useBottomNavPanelTransition(): BottomNavPanelTransitionState {
  return useContext(BottomNavPanelContext);
}

/** @deprecated Prefer useBottomNavTransitionActions + useBottomNavPanelTransition */
export function useMobileBottomNavTransition(): BottomNavTransitionActions & {
  panel: BottomNavPanelTransitionState;
  isTransitioning: boolean;
} {
  const actions = useBottomNavTransitionActions();
  const panel = useBottomNavPanelTransition();
  return {
    ...actions,
    panel,
    isTransitioning: panel.active,
  };
}
