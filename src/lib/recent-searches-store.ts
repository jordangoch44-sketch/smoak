/**
 * Recent Explore search queries (localStorage).
 *
 * Write path: `useExploreTrainers` → `recordRecentSearch()` on successful search.
 * Read UI: Explore search overlay (last 3).
 *
 * Use `useSyncExternalStore` with:
 * `subscribeRecentSearches`, `getRecentSearchesSnapshot`, `getRecentSearchesServerSnapshot`.
 */
import {
  loadRecentSearches,
  mergeRecentSearch,
  persistRecentSearches,
  type RecentSearchEntry,
} from "@/lib/recent-searches-storage";

const EMPTY: RecentSearchEntry[] = [];
const listeners = new Set<() => void>();
let cachedEntries: RecentSearchEntry[] | undefined;

function readCache(): RecentSearchEntry[] {
  if (typeof window === "undefined") return EMPTY;
  if (cachedEntries === undefined) {
    cachedEntries = loadRecentSearches();
  }
  return cachedEntries;
}

export function subscribeRecentSearches(onStoreChange: () => void): () => void {
  if (typeof window !== "undefined") {
    readCache();
  }
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getRecentSearchesSnapshot(): readonly RecentSearchEntry[] {
  return readCache();
}

export function getRecentSearchesServerSnapshot(): readonly RecentSearchEntry[] {
  return EMPTY;
}

export function recordRecentSearch(query: string): void {
  const next = mergeRecentSearch([...readCache()], query);
  cachedEntries = next;
  persistRecentSearches(next);
  listeners.forEach((listener) => listener());
}
