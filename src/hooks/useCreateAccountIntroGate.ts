"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState, useSyncExternalStore } from "react";
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
  const queryIntro =
    onJoinRoute &&
    (hasJoinIntroInSearch(locationSearch) || initialJoinIntro);
  const dismissKey = `${pathname}${locationSearch}`;

  const [dismissKeySeen, setDismissKeySeen] = useState(dismissKey);
  const [introDismissed, setIntroDismissed] = useState(false);

  if (dismissKey !== dismissKeySeen) {
    setDismissKeySeen(dismissKey);
    setIntroDismissed(false);
  }

  const showIntro = mounted && queryIntro && !introDismissed;

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
