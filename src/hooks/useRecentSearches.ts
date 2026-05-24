"use client";

import { useSyncExternalStore } from "react";
import {
  getRecentSearchesServerSnapshot,
  getRecentSearchesSnapshot,
  subscribeRecentSearches,
} from "@/lib/recent-searches-store";

export function useRecentSearches() {
  const entries = useSyncExternalStore(
    subscribeRecentSearches,
    getRecentSearchesSnapshot,
    getRecentSearchesServerSnapshot
  );

  return { entries };
}
