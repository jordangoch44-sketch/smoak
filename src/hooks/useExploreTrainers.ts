"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type SetStateAction,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { trainers } from "@/data/trainers";
import {
  EMPTY_TRAINER_FILTERS,
  countActiveFilters,
  filterExploreTrainers,
} from "@/lib/explore";
import {
  getActiveFilterChips,
  removeFilterFromState,
  type ActiveFilterKey,
} from "@/lib/explore-active-filters";
import {
  buildExploreSearchParams,
  exploreParamsEqual,
  filtersFromSearchParams,
  hasExplicitFilterParams,
} from "@/lib/explore-url";
import { recordRecentSearch } from "@/lib/recent-searches-store";
import {
  getHiddenTrainersServerSnapshot,
  getHiddenTrainersSnapshot,
  subscribeHiddenTrainers,
} from "@/lib/hidden-trainers-store";
import {
  getSpecialistProfilesServerSnapshot,
  getSpecialistProfilesSnapshot,
  getTrainerWithOverrides,
  subscribeSpecialistProfiles,
} from "@/lib/specialist-profile-store";
import { applySearchQueryToExploreState } from "@/lib/search-query-parser";
import type { TrainerFilters } from "@/types";

interface UseExploreTrainersOptions {
  initialSpecialty?: string;
  initialQuery?: string;
}

function mergeParsedWithUrlFilters(
  fromUrl: TrainerFilters,
  parsed: TrainerFilters
): TrainerFilters {
  return {
    city: fromUrl.city || parsed.city,
    neighborhood: fromUrl.neighborhood || parsed.neighborhood,
    profession: fromUrl.profession || parsed.profession,
    specialty: fromUrl.specialty || parsed.specialty,
    gender: fromUrl.gender || parsed.gender,
    priceMax: fromUrl.priceMax || parsed.priceMax,
  };
}

function applyExplicitUrlFilters(
  fromUrl: TrainerFilters,
  prev: TrainerFilters
): TrainerFilters {
  return {
    ...EMPTY_TRAINER_FILTERS,
    city: fromUrl.city,
    neighborhood: fromUrl.neighborhood,
    profession: fromUrl.profession,
    specialty: fromUrl.specialty,
    gender: fromUrl.gender || prev.gender,
    priceMax: fromUrl.priceMax || prev.priceMax,
  };
}

function filtersEqual(a: TrainerFilters, b: TrainerFilters): boolean {
  return (
    a.city === b.city &&
    a.neighborhood === b.neighborhood &&
    a.profession === b.profession &&
    a.specialty === b.specialty &&
    a.gender === b.gender &&
    a.priceMax === b.priceMax
  );
}

function buildInitialFilters(
  searchParams: URLSearchParams,
  initialSpecialty: string
): TrainerFilters {
  const fromUrl = filtersFromSearchParams(searchParams);
  return {
    ...EMPTY_TRAINER_FILTERS,
    ...fromUrl,
    specialty: initialSpecialty || fromUrl.specialty,
  };
}

/** Apply URL-driven state updates outside the effect body (satisfies react-hooks/set-state-in-effect) */
function applyUrlSearchSync(update: () => void): void {
  queueMicrotask(update);
}

export function useExploreTrainers({
  initialSpecialty = "",
  initialQuery = "",
}: UseExploreTrainersOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialQ = initialQuery || searchParams.get("q") || "";
  const initialBaseFilters = buildInitialFilters(searchParams, initialSpecialty);
  const initialParsed = applySearchQueryToExploreState(initialQ, {
    ...EMPTY_TRAINER_FILTERS,
    gender: initialBaseFilters.gender,
    priceMax: initialBaseFilters.priceMax,
  });
  const initialApplied = {
    displayQuery: initialParsed.displayQuery,
    residualQuery: initialParsed.residualQuery,
    filters: mergeParsedWithUrlFilters(initialBaseFilters, initialParsed.filters),
  };

  const [filters, setFiltersState] = useState<TrainerFilters>(
    () => initialApplied.filters
  );
  const [displayQuery, setDisplayQuery] = useState(
    () => initialApplied.displayQuery
  );
  const [searchQuery, setSearchQuery] = useState(
    () => initialApplied.residualQuery
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const lastSyncedQ = useRef<string | null>(null);
  const lastPushedParams = useRef<string | null>(null);

  const pendingUrlSyncRef = useRef<{
    filters: TrainerFilters;
    displayQuery: string;
  } | null>(null);

  const flushUrlSync = useCallback(() => {
    const pending = pendingUrlSyncRef.current;
    if (!pending) return;
    pendingUrlSyncRef.current = null;

    const current =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).toString()
        : searchParams.toString();
    if (exploreParamsEqual(current, pending.filters, pending.displayQuery)) {
      return;
    }

    const next = buildExploreSearchParams(pending.filters, pending.displayQuery);
    lastPushedParams.current = next;
    router.replace(
      next ? `${pathname}?${next}` : pathname,
      { scroll: false }
    );
  }, [router, pathname, searchParams]);

  const scheduleUrlSync = useCallback(
    (nextFilters: TrainerFilters, nextDisplayQuery: string) => {
      pendingUrlSyncRef.current = {
        filters: nextFilters,
        displayQuery: nextDisplayQuery,
      };
      queueMicrotask(flushUrlSync);
    },
    [flushUrlSync]
  );

  /* Sync when URL changes externally (homepage, back/forward) — not our own replace */
  useEffect(() => {
    const current = searchParams.toString();
    if (
      lastPushedParams.current !== null &&
      lastPushedParams.current === current
    ) {
      lastPushedParams.current = null;
      return;
    }

    const nextQ = searchParams.get("q") ?? "";
    const fromUrl = filtersFromSearchParams(searchParams);
    const qChanged = lastSyncedQ.current !== nextQ;
    lastSyncedQ.current = nextQ;

    applyUrlSearchSync(() => {
      if (nextQ) {
        setDisplayQuery(nextQ);
        const parsed = applySearchQueryToExploreState(nextQ, {
          ...EMPTY_TRAINER_FILTERS,
          gender: fromUrl.gender,
          priceMax: fromUrl.priceMax,
        });

        if (qChanged) {
          setSearchQuery(parsed.residualQuery);
          setFiltersState(mergeParsedWithUrlFilters(fromUrl, parsed.filters));
          return;
        }

        setSearchQuery(parsed.residualQuery);

        if (hasExplicitFilterParams(searchParams)) {
          setFiltersState((prev) => {
            const next = applyExplicitUrlFilters(fromUrl, prev);
            return filtersEqual(prev, next) ? prev : next;
          });
        }
        return;
      }

      lastSyncedQ.current = "";
      setDisplayQuery("");
      setSearchQuery("");
      setFiltersState((prev) => {
        const next = { ...EMPTY_TRAINER_FILTERS, ...fromUrl };
        const same =
          prev.city === next.city &&
          prev.neighborhood === next.neighborhood &&
          prev.profession === next.profession &&
          prev.specialty === next.specialty &&
          prev.gender === next.gender &&
          prev.priceMax === next.priceMax;
        return same ? prev : next;
      });
    });
  }, [searchParams]);

  const setFilters = useCallback(
    (action: SetStateAction<TrainerFilters>) => {
      let nextFilters: TrainerFilters | null = null;
      setFiltersState((prev) => {
        nextFilters = typeof action === "function" ? action(prev) : action;
        return nextFilters;
      });
      if (nextFilters) {
        scheduleUrlSync(nextFilters, displayQuery);
      }
    },
    [scheduleUrlSync, displayQuery]
  );

  const profileOverridesRevision = useSyncExternalStore(
    subscribeSpecialistProfiles,
    getSpecialistProfilesSnapshot,
    getSpecialistProfilesServerSnapshot
  );

  const hiddenRevision = useSyncExternalStore(
    subscribeHiddenTrainers,
    getHiddenTrainersSnapshot,
    getHiddenTrainersServerSnapshot
  );

  const filtered = useMemo(() => {
    void profileOverridesRevision;
    void hiddenRevision;
    const hiddenSet = new Set(getHiddenTrainersSnapshot());
    return filterExploreTrainers(trainers, filters, searchQuery)
      .filter((trainer) => !hiddenSet.has(trainer.id))
      .map((trainer) => getTrainerWithOverrides(trainer.id) ?? trainer);
  }, [filters, searchQuery, profileOverridesRevision, hiddenRevision]);

  const activeFilterCount = countActiveFilters(filters);
  const activeFilterChips = useMemo(
    () => getActiveFilterChips(filters),
    [filters]
  );
  const hasSearch = Boolean(displayQuery.trim());
  const hasActiveFiltersOrSearch =
    activeFilterCount > 0 || hasSearch;

  const clearFilters = useCallback(() => {
    let nextFilters: TrainerFilters | null = null;
    setFiltersState((prev) => {
      nextFilters = {
        ...EMPTY_TRAINER_FILTERS,
        gender: prev.gender,
        priceMax: prev.priceMax,
      };
      return nextFilters;
    });
    if (nextFilters) {
      scheduleUrlSync(nextFilters, displayQuery);
    }
  }, [scheduleUrlSync, displayQuery]);

  const submitSearch = useCallback(
    (rawQuery: string) => {
      const applied = applySearchQueryToExploreState(rawQuery, {
        ...filters,
        city: "",
        neighborhood: "",
        profession: "",
        specialty: "",
      });
      const nextFilters = {
        ...applied.filters,
        gender: filters.gender,
        priceMax: filters.priceMax,
      };
      setDisplayQuery(applied.displayQuery);
      setSearchQuery(applied.residualQuery);
      setFiltersState(nextFilters);
      if (applied.displayQuery.trim()) {
        recordRecentSearch(applied.displayQuery);
      }
      scheduleUrlSync(nextFilters, applied.displayQuery);
    },
    [filters, scheduleUrlSync]
  );

  const clearSearch = useCallback(() => {
    let nextFilters: TrainerFilters | null = null;
    setDisplayQuery("");
    setSearchQuery("");
    setFiltersState((prev) => {
      nextFilters = {
        ...prev,
        city: "",
        neighborhood: "",
        profession: "",
        specialty: "",
      };
      return nextFilters;
    });
    if (nextFilters) {
      scheduleUrlSync(nextFilters, "");
    }
  }, [scheduleUrlSync]);

  const clearAll = useCallback(() => {
    setDisplayQuery("");
    setSearchQuery("");
    setFiltersState(EMPTY_TRAINER_FILTERS);
    scheduleUrlSync(EMPTY_TRAINER_FILTERS, "");
  }, [scheduleUrlSync]);

  const removeFilter = useCallback(
    (key: ActiveFilterKey) => {
      let nextFilters: TrainerFilters | null = null;
      setFiltersState((prev) => {
        nextFilters = removeFilterFromState(prev, key);
        return nextFilters;
      });
      if (nextFilters) {
        scheduleUrlSync(nextFilters, displayQuery);
      }
    },
    [scheduleUrlSync, displayQuery]
  );

  return {
    filters,
    setFilters,
    displayQuery,
    searchQuery,
    setSearchQuery,
    submitSearch,
    mobileFiltersOpen,
    setMobileFiltersOpen,
    filtered,
    activeFilterCount,
    activeFilterChips,
    hasSearch,
    hasActiveFiltersOrSearch,
    clearFilters,
    clearSearch,
    clearAll,
    removeFilter,
  };
}
