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
import { listPublicMarketplaceTrainers } from "@/lib/marketplace-public-catalog";
import {
  DEFAULT_EXPLORE_RADIUS_MILES,
  EMPTY_TRAINER_FILTERS,
  countActiveFilters,
  filterExploreTrainersInArea,
  getSuggestedExploreTrainers,
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
import {
  mergeExploreFiltersWithSavedLocation,
  resolveExploreMapArea,
} from "@/lib/explore-location-filters";
import {
  getHiddenTrainersServerSnapshot,
  getHiddenTrainersSnapshot,
  subscribeHiddenTrainers,
} from "@/lib/hidden-trainers-store";
import {
  getApprovedSpecialistProfilesServerSnapshot,
  getApprovedSpecialistProfilesSnapshot,
  primePublicCatalogFromSSR,
  subscribeApprovedSpecialistProfiles,
} from "@/lib/approved-specialist-profiles-store";
import {
  getSpecialistApplicationsServerSnapshot,
  getSpecialistApplicationsSnapshot,
  subscribeSpecialistApplications,
} from "@/lib/specialist-application-storage";
import {
  getSpecialistProfilesServerSnapshot,
  getSpecialistProfilesSnapshot,
  getTrainerWithOverrides,
  subscribeSpecialistProfiles,
} from "@/lib/specialist-profile-store";
import { applySearchQueryToExploreState } from "@/lib/search-query-parser";
import {
  useActiveUserCoordinates,
  useActiveUserCoordinatesKey,
} from "@/hooks/useActiveUserCoordinates";
import { useHydrated } from "@/hooks/useHydrated";
import { useAuthSession } from "@/hooks/useAuthSession";
import { sortTrainersByProximity } from "@/lib/trainer-proximity-sort";
import { recordRecentSearch } from "@/lib/recent-searches-store";
import type { AuthSession } from "@/types/auth";

import type { TrainerFilters } from "@/types";
import type { Trainer } from "@/types/trainer";
import type { PublicCatalogMode } from "@/lib/public-catalog-mode";

interface UseExploreTrainersOptions {
  initialSpecialty?: string;
  initialQuery?: string;
  /** SSR catalog rows (approved when live; seed when offline demo) */
  initialCatalog?: Trainer[];
  catalogMode?: PublicCatalogMode;
}

function mergeParsedWithUrlFilters(
  fromUrl: TrainerFilters,
  parsed: TrainerFilters
): TrainerFilters {
  return {
    zipCode: fromUrl.zipCode || parsed.zipCode,
    city: fromUrl.city || parsed.city,
    neighborhood: fromUrl.neighborhood || parsed.neighborhood,
    profession: fromUrl.profession || parsed.profession,
    specialty: fromUrl.specialty || parsed.specialty,
    gender: fromUrl.gender || parsed.gender,
    priceMin: fromUrl.priceMin || parsed.priceMin,
    priceMax: fromUrl.priceMax || parsed.priceMax,
    serviceType: fromUrl.serviceType || parsed.serviceType,
  };
}

function applyExplicitUrlFilters(
  fromUrl: TrainerFilters,
  prev: TrainerFilters
): TrainerFilters {
  return {
    ...EMPTY_TRAINER_FILTERS,
    zipCode: fromUrl.zipCode,
    city: fromUrl.city,
    neighborhood: fromUrl.neighborhood,
    profession: fromUrl.profession,
    specialty: fromUrl.specialty,
    gender: fromUrl.gender || prev.gender,
    priceMin: fromUrl.priceMin || prev.priceMin,
    priceMax: fromUrl.priceMax || prev.priceMax,
    serviceType: fromUrl.serviceType || prev.serviceType,
  };
}

function filtersEqual(a: TrainerFilters, b: TrainerFilters): boolean {
  return (
    a.zipCode === b.zipCode &&
    a.city === b.city &&
    a.neighborhood === b.neighborhood &&
    a.profession === b.profession &&
    a.specialty === b.specialty &&
    a.gender === b.gender &&
    a.priceMin === b.priceMin &&
    a.priceMax === b.priceMax &&
    a.serviceType === b.serviceType
  );
}

function buildInitialFilters(
  searchParams: URLSearchParams,
  initialSpecialty: string,
  _session: AuthSession | null
): TrainerFilters {
  const fromUrl = filtersFromSearchParams(searchParams);
  return {
    ...EMPTY_TRAINER_FILTERS,
    ...fromUrl,
    specialty: initialSpecialty || fromUrl.specialty,
  };
}

function filtersFromUrlOrSaved(
  fromUrl: TrainerFilters,
  _hasExplicit: boolean,
  _session: AuthSession | null
): TrainerFilters {
  return { ...EMPTY_TRAINER_FILTERS, ...fromUrl };
}

/** Apply URL-driven state updates outside the effect body (satisfies react-hooks/set-state-in-effect) */
function applyUrlSearchSync(update: () => void): void {
  queueMicrotask(update);
}

export function useExploreTrainers({
  initialSpecialty = "",
  initialQuery = "",
  initialCatalog,
  catalogMode = "live",
}: UseExploreTrainersOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hydrated = useHydrated();
  const { session } = useAuthSession();
  const userCoords = useActiveUserCoordinates();
  const coordsKey = useActiveUserCoordinatesKey();

  useEffect(() => {
    primePublicCatalogFromSSR(initialCatalog, catalogMode);
  }, [initialCatalog, catalogMode]);

  /* After hydrate, surface header ZIP on Explore chips.
   * ZIP / coords also drive the default search radius (see explore.ts). */
  useEffect(() => {
    if (!hydrated) return;
    setFiltersState((prev) => {
      const saved = mergeExploreFiltersWithSavedLocation(
        EMPTY_TRAINER_FILTERS,
        session
      );
      const hasSaved = Boolean(
        saved.zipCode.trim() || saved.city.trim() || saved.neighborhood.trim()
      );

      if (!hasSaved) {
        if (!prev.zipCode.trim()) return prev;
        const cleared = {
          ...prev,
          zipCode: "",
          city: "",
          neighborhood: "",
        };
        return filtersEqual(prev, cleared) ? prev : cleared;
      }

      const merged = mergeExploreFiltersWithSavedLocation(prev, session);
      return filtersEqual(prev, merged) ? prev : merged;
    });
  }, [hydrated, session, coordsKey]);

  const initialQ = initialQuery || searchParams.get("q") || "";
  const initialBaseFilters = buildInitialFilters(
    searchParams,
    initialSpecialty,
    null
  );
  const initialParsed = applySearchQueryToExploreState(initialQ, {
    ...EMPTY_TRAINER_FILTERS,
    gender: initialBaseFilters.gender,
    priceMin: initialBaseFilters.priceMin,
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
    const explicit = hasExplicitFilterParams(searchParams);

    applyUrlSearchSync(() => {
      if (nextQ) {
        setDisplayQuery(nextQ);
        const parsed = applySearchQueryToExploreState(nextQ, {
          ...EMPTY_TRAINER_FILTERS,
          gender: fromUrl.gender,
          priceMin: fromUrl.priceMin,
          priceMax: fromUrl.priceMax,
          serviceType: fromUrl.serviceType,
        });

        if (qChanged) {
          setSearchQuery(parsed.residualQuery);
          setFiltersState(mergeParsedWithUrlFilters(fromUrl, parsed.filters));
          return;
        }

        setSearchQuery(parsed.residualQuery);

        if (explicit) {
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
        const next = filtersFromUrlOrSaved(fromUrl, explicit, session);
        return filtersEqual(prev, next) ? prev : next;
      });
    });
  }, [searchParams, session]);

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
  const approvedProfilesRevision = useSyncExternalStore(
    subscribeApprovedSpecialistProfiles,
    getApprovedSpecialistProfilesSnapshot,
    getApprovedSpecialistProfilesServerSnapshot
  );
  const applicationsRevision = useSyncExternalStore(
    subscribeSpecialistApplications,
    getSpecialistApplicationsSnapshot,
    getSpecialistApplicationsServerSnapshot
  );

  const hiddenRevision = useSyncExternalStore(
    subscribeHiddenTrainers,
    getHiddenTrainersSnapshot,
    getHiddenTrainersServerSnapshot
  );

  const [nearbyExpanded, setNearbyExpanded] = useState(false);

  const getCatalogTrainers = useCallback(() => {
    void profileOverridesRevision;
    void approvedProfilesRevision;
    void applicationsRevision;
    void hiddenRevision;
    const hiddenSet = new Set(getHiddenTrainersSnapshot());
    return listPublicMarketplaceTrainers({
      remoteApproved: catalogMode === "live" ? initialCatalog : undefined,
      catalogMode,
    })
      .filter((trainer) =>
        catalogMode === "live" ? true : !hiddenSet.has(trainer.id)
      )
      .map((trainer) =>
        catalogMode === "live"
          ? trainer
          : (getTrainerWithOverrides(trainer.id) ?? trainer)
      );
  }, [
    profileOverridesRevision,
    approvedProfilesRevision,
    applicationsRevision,
    hiddenRevision,
    initialCatalog,
    catalogMode,
  ]);

  const searchOrigin = useMemo(() => {
    if (!hydrated) return null;
    return resolveExploreMapArea(filters, userCoords);
  }, [filters, userCoords, hydrated, coordsKey]);

  const filterKey = useMemo(
    () =>
      [
        filters.zipCode,
        filters.city,
        filters.neighborhood,
        filters.profession,
        filters.specialty,
        filters.gender,
        filters.priceMin,
        filters.priceMax,
        filters.serviceType,
        searchQuery,
      ].join("|"),
    [filters, searchQuery]
  );

  useEffect(() => {
    setNearbyExpanded(false);
  }, [filterKey]);

  const { filtered, areaEmpty, resultsBroadened } = useMemo(() => {
    const catalog = getCatalogTrainers();
    const origin = searchOrigin;
    const radiusMiles = origin ? DEFAULT_EXPLORE_RADIUS_MILES : null;
    const area = filterExploreTrainersInArea(
      catalog,
      filters,
      searchQuery,
      origin,
      { radiusMiles, nearbyExpanded }
    );
    const coords = origin ?? (hydrated ? userCoords : null);
    return {
      filtered: sortTrainersByProximity(area.trainers, coords, {
        profession: filters.profession,
        specialty: filters.specialty,
      }),
      areaEmpty: area.areaEmpty,
      resultsBroadened: area.nearbyExpanded,
    };
  }, [
    getCatalogTrainers,
    filters,
    searchQuery,
    searchOrigin,
    nearbyExpanded,
    hydrated,
    userCoords,
    coordsKey,
  ]);

  const suggestedTrainers = useMemo(() => {
    if (filtered.length > 0) return [];
    const catalog = getCatalogTrainers();
    return getSuggestedExploreTrainers(catalog, filters, searchOrigin, {
      excludeIds: filtered.map((t) => t.id),
    });
  }, [filtered, getCatalogTrainers, filters, searchOrigin]);

  const getExploreMatchCount = useCallback(
    (candidateFilters: TrainerFilters) => {
      const catalog = getCatalogTrainers();
      const origin = resolveExploreMapArea(candidateFilters, userCoords);
      return filterExploreTrainersInArea(
        catalog,
        candidateFilters,
        searchQuery,
        origin,
        { radiusMiles: origin ? DEFAULT_EXPLORE_RADIUS_MILES : null }
      ).trainers.length;
    },
    [getCatalogTrainers, searchQuery, userCoords]
  );

  const expandNearbyResults = useCallback(() => {
    setNearbyExpanded(true);
  }, []);

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
        priceMin: prev.priceMin,
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
        zipCode: "",
        city: "",
        neighborhood: "",
        profession: "",
        specialty: "",
      });
      /* Keep any explicit city/neighborhood parsed from the query; never
       * inject the client's ZIP as a hard location filter. */
      const nextFilters = mergeExploreFiltersWithSavedLocation(
        {
          ...applied.filters,
          gender: filters.gender,
          priceMin: filters.priceMin,
          priceMax: filters.priceMax,
          serviceType: filters.serviceType,
        },
        session
      );
      setDisplayQuery(applied.displayQuery);
      setSearchQuery(applied.residualQuery);
      setFiltersState(nextFilters);
      if (applied.displayQuery.trim()) {
        recordRecentSearch(applied.displayQuery);
      }
      scheduleUrlSync(nextFilters, applied.displayQuery);
    },
    [filters, scheduleUrlSync, session]
  );

  const clearSearch = useCallback(() => {
    let nextFilters: TrainerFilters | null = null;
    setDisplayQuery("");
    setSearchQuery("");
    setFiltersState((prev) => {
      nextFilters = {
        ...prev,
        zipCode: "",
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
    const cleared = { ...EMPTY_TRAINER_FILTERS };
    setDisplayQuery("");
    setSearchQuery("");
    setFiltersState(cleared);
    scheduleUrlSync(cleared, "");
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
    areaEmpty,
    resultsBroadened,
    suggestedTrainers,
    expandNearbyResults,
    getExploreMatchCount,
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
