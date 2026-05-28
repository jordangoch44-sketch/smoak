"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useHydrated } from "@/hooks/useHydrated";
import { scheduleAfterFirstPaint } from "@/lib/schedule-after-paint";
import {
  hasSeenSiteIntro,
  markSiteIntroSeen,
} from "@/lib/site-intro-storage";

const SmoacWelcomeIntro = dynamic(
  () =>
    import("@/components/brand/SmoacWelcomeIntro").then(
      (mod) => mod.SmoacWelcomeIntro
    ),
  { ssr: false }
);

function subscribeSiteIntro(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => onStoreChange();
  window.addEventListener("smoac-site-intro-change", handler);
  return () => window.removeEventListener("smoac-site-intro-change", handler);
}

function getSiteIntroSeenSnapshot(): boolean {
  return hasSeenSiteIntro();
}

/**
 * Homepage welcome — deferred until after first paint so iPhone can hydrate
 * and become interactive before the overlay loads.
 */
export function SiteWelcomeIntroGate() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const [finished, setFinished] = useState(false);
  const [allowIntro, setAllowIntro] = useState(false);
  const [introVisible, setIntroVisible] = useState(false);
  const introSeen = useSyncExternalStore(
    subscribeSiteIntro,
    getSiteIntroSeenSnapshot,
    () => false
  );

  const pendingFirstVisit =
    pathname === "/" && !introSeen && !finished;
  const playing = hydrated && allowIntro && pendingFirstVisit;
  const blockChrome = playing && introVisible;

  if (!pendingFirstVisit && allowIntro) {
    setAllowIntro(false);
  }

  if (!playing && introVisible) {
    setIntroVisible(false);
  }

  const handleComplete = useCallback(() => {
    markSiteIntroSeen();
    setFinished(true);
    setIntroVisible(false);
  }, []);

  const handleIntroVisible = useCallback(() => {
    setIntroVisible(true);
  }, []);

  useEffect(() => {
    if (!pendingFirstVisit) return;
    return scheduleAfterFirstPaint(() => setAllowIntro(true));
  }, [pendingFirstVisit]);

  useEffect(() => {
    document.body.classList.toggle("site-intro-open", blockChrome);
    return () => document.body.classList.remove("site-intro-open");
  }, [blockChrome]);

  useEffect(() => {
    if (!playing) return;
    return () => {
      if (!hasSeenSiteIntro()) {
        markSiteIntroSeen();
      }
    };
  }, [playing]);

  if (!playing) {
    return null;
  }

  return createPortal(
    <SmoacWelcomeIntro
      variant="site"
      onComplete={handleComplete}
      onVisible={handleIntroVisible}
    />,
    document.body
  );
}
