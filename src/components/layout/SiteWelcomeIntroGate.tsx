"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { SmoacWelcomeIntro } from "@/components/brand/SmoacWelcomeIntro";
import { useHydrated } from "@/hooks/useHydrated";
import {
  clearSiteIntroSeen,
  hasSeenSiteIntro,
  markSiteIntroSeen,
  subscribeSiteIntroChange,
} from "@/lib/site-intro-storage";

function clearIntroPendingClass() {
  document.documentElement.classList.remove("site-intro-pending");
}

/**
 * Homepage welcome warp. A pre-paint boot script (`SiteIntroBoot`) covers the
 * page until this mounts so the site never peeks through first.
 *
 * Force replay: `/?replay-intro=1` (dev / QA).
 */
export function SiteWelcomeIntroGate() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const [finished, setFinished] = useState(false);
  const [forceReplay, setForceReplay] = useState(false);
  const [arriving, setArriving] = useState(false);
  const introSeen = useSyncExternalStore(
    subscribeSiteIntroChange,
    hasSeenSiteIntro,
    () => false
  );

  /* Sync force-replay before paint so we don't skip the warp on first client frame. */
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("replay-intro") === "1") {
      clearSiteIntroSeen();
      setFinished(false);
      setArriving(false);
      setForceReplay(true);
      document.documentElement.classList.add("site-intro-pending");
    }
  }, []);

  const pendingFirstVisit =
    pathname === "/" && (!introSeen || forceReplay) && !finished;
  const playing = hydrated && pendingFirstVisit;

  const handleComplete = useCallback(() => {
    markSiteIntroSeen();
    setFinished(true);
    setForceReplay(false);
    setArriving(false);
    clearIntroPendingClass();
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

  /* Keep the dark cover until the warp portal is mounted; cover sits under the intro z-index. */
  useLayoutEffect(() => {
    if (!pendingFirstVisit) {
      clearIntroPendingClass();
    }
  }, [pendingFirstVisit]);

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
