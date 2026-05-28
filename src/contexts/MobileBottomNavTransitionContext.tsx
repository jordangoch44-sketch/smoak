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
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { SmoacDirectoryLoaderPhase } from "@/components/brand/SmoacDirectoryLoader";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useTabletViewport } from "@/hooks/useTabletViewport";
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
  enterOnly: boolean;
}

interface BeginBottomNavTransitionOptions {
  fromId: MobileBottomNavItemId;
  toId: MobileBottomNavItemId;
}

interface MobileBottomNavTransitionContextValue {
  isTransitioning: boolean;
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

export function MobileBottomNavTransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const reducedMotion = usePrefersReducedMotion();
  const isTabletViewport = useTabletViewport();
  const [mounted, setMounted] = useState(false);
  const [showDirectoryOverlay, setShowDirectoryOverlay] = useState(false);
  const [directoryLoaderPhase, setDirectoryLoaderPhase] =
    useState<SmoacDirectoryLoaderPhase>("exit");
  const [panel, setPanel] = useState<BottomNavPanelTransitionState>(INACTIVE_PANEL);
  const [isNavLocked, setIsNavLocked] = useState(false);
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
    setIsNavLocked(false);
    setBottomNavPanelBodyActive(false);
    pendingTargetScrollKeyRef.current = null;
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
    (href: string, options: BeginBottomNavTransitionOptions) => {
      const direction = getBottomNavPanelDirection(
        options.fromId,
        options.toId
      );
      saveBottomNavScroll(
        getBottomNavRouteKey(pathname, getClientRouteSearch())
      );

      pendingPanelRef.current = { href, direction, enterOnly: false };
      router.push(href);

      const panelMs = reducedMotion
        ? BOTTOM_NAV_PANEL_REDUCED_MS
        : BOTTOM_NAV_PANEL_MS;
      schedule(completePanelTransition, panelMs + 80);
    },
    [completePanelTransition, pathname, reducedMotion, router, schedule]
  );

  const runDirectoryTransition = useCallback(
    (href: string) => {
      const totalMs = reducedMotion
        ? BOTTOM_NAV_DIRECTORY_REDUCED_TOTAL_MS
        : BOTTOM_NAV_DIRECTORY_TOTAL_MS;
      const outMs = reducedMotion
        ? BOTTOM_NAV_DIRECTORY_REDUCED_OUT_MS
        : BOTTOM_NAV_DIRECTORY_OUT_MS;
      const panelMs = reducedMotion
        ? BOTTOM_NAV_PANEL_REDUCED_MS
        : BOTTOM_NAV_PANEL_MS;

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

      schedule(completePanelTransition, totalMs + panelMs + 80);
    },
    [
      activatePanel,
      completePanelTransition,
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
      if (lockRef.current) return;

      if (!isTabletViewport) {
        router.push(href);
        return;
      }

      lockRef.current = true;
      setIsNavLocked(true);
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

  const value = useMemo<MobileBottomNavTransitionContextValue>(
    () => ({
      isTransitioning: isNavLocked || panel.active || showDirectoryOverlay,
      panel,
      beginBottomNavTransition,
      completePanelTransition,
    }),
    [
      isNavLocked,
      panel,
      showDirectoryOverlay,
      beginBottomNavTransition,
      completePanelTransition,
    ]
  );

  return (
    <MobileBottomNavTransitionContext.Provider value={value}>
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

/** Panel state for PageTransition — stable inactive default outside provider */
export function useBottomNavPanelTransition(): BottomNavPanelTransitionState {
  return useContext(MobileBottomNavTransitionContext)?.panel ?? INACTIVE_PANEL;
}
