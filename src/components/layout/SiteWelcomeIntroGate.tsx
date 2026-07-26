"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useHydrated } from "@/hooks/useHydrated";
import {
  clearSiteIntroSeen,
  hasSeenSiteIntro,
  markSiteIntroSeen,
  subscribeSiteIntroChange,
} from "@/lib/site-intro-storage";

const SmoacWelcomeIntro = dynamic(
  () =>
    import("@/components/brand/SmoacWelcomeIntro").then(
      (mod) => mod.SmoacWelcomeIntro
    ),
  { ssr: false }
);

/**
 * Homepage welcome — deferred until after first paint so iPhone can hydrate
 * and become interactive before the overlay loads.
 *
 * Force replay: `/?replay-intro=1` (dev / QA).
 */
export function SiteWelcomeIntroGate() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const [finished, setFinished] = useState(false);
  const [allowIntro, setAllowIntro] = useState(false);
  const [forceReplay, setForceReplay] = useState(false);
  const [arriving, setArriving] = useState(false);
  const introSeen = useSyncExternalStore(
    subscribeSiteIntroChange,
    hasSeenSiteIntro,
    () => false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("replay-intro") === "1") {
      clearSiteIntroSeen();
      setFinished(false);
      setAllowIntro(false);
      setArriving(false);
      setForceReplay(true);
    }
  }, []);

  const pendingFirstVisit =
    pathname === "/" && (!introSeen || forceReplay) && !finished;
  const playing = hydrated && allowIntro && pendingFirstVisit;

  if (!pendingFirstVisit && allowIntro) {
    setAllowIntro(false);
  }

  const handleComplete = useCallback(() => {
    markSiteIntroSeen();
    setFinished(true);
    setForceReplay(false);
    setArriving(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("replay-intro")) {
        url.searchParams.delete("replay-intro");
        window.history.replaceState(
          {},
          "",
          url.pathname + url.search + url.hash
        );
      }
    }
  }, []);

  const handleArrive = useCallback(() => {
    setArriving(true);
  }, []);

  useEffect(() => {
    if (!pendingFirstVisit) return;
    /* Short delay so first paint / hydration can settle, then start the warp. */
    const id = window.setTimeout(() => setAllowIntro(true), 280);
    return () => window.clearTimeout(id);
  }, [pendingFirstVisit, forceReplay]);

  useEffect(() => {
    document.documentElement.classList.toggle("site-intro-open", playing);
    document.body.classList.toggle("site-intro-open", playing);
    document.documentElement.classList.toggle("site-intro-arriving", arriving);
    document.body.classList.toggle("site-intro-arriving", arriving);
    return () => {
      document.documentElement.classList.remove("site-intro-open");
      document.body.classList.remove("site-intro-open");
      document.documentElement.classList.remove("site-intro-arriving");
      document.body.classList.remove("site-intro-arriving");
    };
  }, [playing, arriving]);

  if (!playing) {
    return null;
  }

  return createPortal(
    <SmoacWelcomeIntro
      variant="site"
      onComplete={handleComplete}
      onArrive={handleArrive}
    />,
    document.body
  );
}
