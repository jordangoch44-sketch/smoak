"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  clearJoinIntroFromUrl,
  JOIN_FLOW_PATH,
  JOIN_INTRO_PARAM,
} from "@/lib/join-flow";

function subscribeLocationSearch(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function getLocationSearchSnapshot(): string {
  return window.location.search;
}

function hasJoinIntroInSearch(search: string): boolean {
  return new URLSearchParams(search).get(JOIN_INTRO_PARAM) === "1";
}

/** Welcome intro when `?intro=1` — no useSearchParams (avoids Suspense black screen) */
export function useCreateAccountIntroGate(initialJoinIntro = false) {
  const router = useRouter();
  const pathname = usePathname();
  const [introDismissed, setIntroDismissed] = useState(false);
  const [queryIntro, setQueryIntro] = useState(initialJoinIntro);
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
  const locationSearch = useSyncExternalStore(
    subscribeLocationSearch,
    getLocationSearchSnapshot,
    () => ""
  );

  const onJoinRoute = pathname === JOIN_FLOW_PATH;

  useEffect(() => {
    setQueryIntro(hasJoinIntroInSearch(window.location.search));
  }, [locationSearch, pathname, initialJoinIntro]);

  useEffect(() => {
    setIntroDismissed(false);
  }, [locationSearch, onJoinRoute]);

  const introRequested = onJoinRoute && (queryIntro || initialJoinIntro);
  const showIntro = mounted && introRequested && !introDismissed;

  const completeIntro = useCallback(() => {
    setIntroDismissed(true);
    clearJoinIntroFromUrl(router);
  }, [router]);

  return {
    ready: mounted,
    showIntro,
    completeIntro,
  };
}
