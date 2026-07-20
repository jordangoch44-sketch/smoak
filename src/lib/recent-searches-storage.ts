export interface RecentSearchEntry {
  id: string;
  query: string;
  searchedAt: string;
}

export const RECENT_SEARCHES_STORAGE_KEY = "smoac-recent-searches";
const STORAGE_KEY = RECENT_SEARCHES_STORAGE_KEY;
const MAX_ENTRIES = 6;

export function loadRecentSearches(): RecentSearchEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentSearchEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistRecentSearches(entries: RecentSearchEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function createRecentSearchEntry(query: string): RecentSearchEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    query: query.trim(),
    searchedAt: new Date().toISOString(),
  };
}

export function mergeRecentSearch(
  entries: RecentSearchEntry[],
  query: string
): RecentSearchEntry[] {
  const trimmed = query.trim();
  if (!trimmed) return entries;

  const withoutDuplicate = entries.filter(
    (entry) => entry.query.toLowerCase() !== trimmed.toLowerCase()
  );
  return [createRecentSearchEntry(trimmed), ...withoutDuplicate].slice(
    0,
    MAX_ENTRIES
  );
}
