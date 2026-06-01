"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMobileMotionProfile } from "@/hooks/useMobileMotionProfile";
import { useTabletViewport } from "@/hooks/useTabletViewport";
import { prefetchBottomNavRoutes } from "@/lib/bottom-nav-prefetch";
import type { MobileBottomNavItemId } from "@/lib/mobile-bottom-nav";
import {
  getClientRouteSearch,
  restoreBottomNavScroll,
  saveBottomNavScroll,
  setBottomNavPanelBodyActive,
} from "@/lib/mobile-chrome";
import {
  BOTTOM_NAV_PANEL_MS,
  BOTTOM_NAV_PANEL_REDUCED_MS,
  BOTTOM_NAV_PANEL_TOUCH_MS,
  getBottomNavPanelDirection,
  getBottomNavRouteKey,
  parseBottomNavHref,
  type BottomNavPanelDirection,
} from "@/lib/mobile-bottom-nav-transition";

export interface BottomNavPanelTransitionState {
  active: boolean;
  direction: BottomNavPanelDirection;
  motionKey: string;
  /** Skip exit animation — used after interrupting an in-flight transition */
  enterOnly: boolean;
}

interface BeginBottomNavTransitionOptions {
  fromId: MobileBottomNavItemId;
  toId: MobileBottomNavItemId;
}

interface BottomNavTransitionActions {
  beginBottomNavTransition: (
    href: string,
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

export function MobileBottomNavTransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { reducedMotion, fastMotion } = useMobileMotionProfile();
  const isTabletViewport = useTabletViewport();
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

      schedule(completePanelTransition, panelMs + 32);
    },
    [completePanelTransition, panelMs, pathname, router, schedule]
  );

  const beginBottomNavTransition = useCallback(
    (href: string, options: BeginBottomNavTransitionOptions) => {
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
      runPanelTransition(href, options, interrupted);
    },
    [
      clearTimers,
      flushTransition,
      isTabletViewport,
      router,
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
