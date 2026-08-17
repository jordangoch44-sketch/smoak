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
  defaultExploreSearchArea,
  type ExploreSearchArea,
} from "@/lib/explore-map-area";
import {
  getActiveFilterChips,
  removeFilterFromState,
  buildDisplayQueryFromSearchFilters,
  residualDisplayQueryAfterSearchFilters,
  stripLocationLabelsFromQuery,
  isSearchBarFilterKey,
  getFilterChipLabel,
  stripChipLabelFromDisplayQuery,
  type ActiveFilterKey,
} from "@/lib/explore-active-filters";
import {
  buildExploreSearchParams,
  exploreParamsEqual,
  filtersFromSearchParams,
  hasExplicitFilterParams,
} from "@/lib/explore-url";
import {
  resolveDefaultExploreSearchArea,
  resolveExploreMapArea,
  exploreFiltersFromZipCode,
} from "@/lib/explore-location-filters";
import { loadSavedZipCode } from "@/lib/user-location-storage";
import { subscribeUserLocation } from "@/lib/user-location-store";
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
import { sortTrainersByProximity } from "@/lib/trainer-proximity-sort";
import { recordRecentSearch } from "@/lib/recent-searches-store";
import type { Trainer, TrainerFilters } from "@/types";
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
  initialCatalog,
  catalogMode = "live",
}: UseExploreTrainersOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hydrated = useHydrated();
  const userCoords = useActiveUserCoordinates();
  const coordsKey = useActiveUserCoordinatesKey();

  useEffect(() => {
    primePublicCatalogFromSSR(initialCatalog, catalogMode);
  }, [initialCatalog, catalogMode]);

  const initialQ = initialQuery || searchParams.get("q") || "";
  const initialBaseFilters = buildInitialFilters(
    searchParams,
    initialSpecialty
  );
  const initialSavedZip =
    typeof window !== "undefined" ? loadSavedZipCode() : null;
  const initialSavedLocation = initialSavedZip
    ? exploreFiltersFromZipCode(initialSavedZip)
    : null;
  const locationOnlyQ = initialSavedLocation
    ? stripLocationLabelsFromQuery(initialQ, initialSavedLocation)
    : stripLocationLabelsFromQuery(initialQ, {
        zipCode: initialBaseFilters.zipCode,
        city: initialBaseFilters.city,
        neighborhood: initialBaseFilters.neighborhood,
      });
  /* Header place leaked into q= with nothing else — ignore it.
   * Otherwise parse the full query so “trainer in Mission Valley” keeps place. */
  const initialKeywordQ = locationOnlyQ.trim() ? initialQ : "";
  const initialParsed = applySearchQueryToExploreState(initialKeywordQ, {
    ...EMPTY_TRAINER_FILTERS,
    gender: initialBaseFilters.gender,
    priceMin: initialBaseFilters.priceMin,
    priceMax: initialBaseFilters.priceMax,
  });
  const initialSyncedDisplay = buildDisplayQueryFromSearchFilters(
    initialParsed.filters,
    initialParsed.residualQuery
  );
  const initialApplied = {
    displayQuery: initialSyncedDisplay || initialParsed.displayQuery,
    residualQuery: initialParsed.residualQuery,
    filters: {
      ...mergeParsedWithUrlFilters(initialBaseFilters, initialParsed.filters),
      zipCode: "",
      city: initialParsed.filters.city,
      neighborhood: initialParsed.filters.neighborhood,
    },
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
  const displayQueryRef = useRef(displayQuery);
  displayQueryRef.current = displayQuery;

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
  const scheduleUrlSyncRef = useRef(scheduleUrlSync);
  scheduleUrlSyncRef.current = scheduleUrlSync;

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
        const savedZip = loadSavedZipCode();
        const savedLocation = savedZip
          ? exploreFiltersFromZipCode(savedZip)
          : null;
        const locationForStrip = {
          zipCode: fromUrl.zipCode || savedLocation?.zipCode || "",
          city: fromUrl.city || savedLocation?.city || "",
          neighborhood:
            fromUrl.neighborhood || savedLocation?.neighborhood || "",
        };
        const keywordOnly = stripLocationLabelsFromQuery(
          nextQ,
          locationForStrip
        );

        /* Header location alone must not become q= / text filter. */
        if (!keywordOnly.trim()) {
          const nextFilters: TrainerFilters = {
            ...EMPTY_TRAINER_FILTERS,
            gender: fromUrl.gender,
            priceMin: fromUrl.priceMin,
            priceMax: fromUrl.priceMax,
            serviceType: fromUrl.serviceType,
            profession: fromUrl.profession,
            specialty: fromUrl.specialty,
          };
          setDisplayQuery("");
          setSearchQuery("");
          setFiltersState((prev) =>
            filtersEqual(prev, nextFilters) ? prev : nextFilters
          );
          scheduleUrlSyncRef.current(nextFilters, "");
          return;
        }

        const parsed = applySearchQueryToExploreState(nextQ, {
          ...EMPTY_TRAINER_FILTERS,
          gender: fromUrl.gender,
          priceMin: fromUrl.priceMin,
          priceMax: fromUrl.priceMax,
          serviceType: fromUrl.serviceType,
        });
        const syncedFilters: TrainerFilters = {
          ...mergeParsedWithUrlFilters(fromUrl, parsed.filters),
          /* Typed place frames the map; header ZIP stays for personalization only. */
          zipCode: "",
          city: parsed.filters.city,
          neighborhood: parsed.filters.neighborhood,
        };
        const syncedDisplay =
          buildDisplayQueryFromSearchFilters(
            syncedFilters,
            parsed.residualQuery
          ) || nextQ;

        setDisplayQuery(syncedDisplay);
        setSearchQuery(parsed.residualQuery);

        if (qChanged) {
          setFiltersState(syncedFilters);
          return;
        }

        if (explicit) {
          setFiltersState((prev) => {
            const next = applyExplicitUrlFilters(
              {
                ...fromUrl,
                zipCode: syncedFilters.zipCode,
                city: syncedFilters.city,
                neighborhood: syncedFilters.neighborhood,
              },
              prev
            );
            return filtersEqual(prev, next) ? prev : next;
          });
        }
        return;
      }

      lastSyncedQ.current = "";
      setDisplayQuery("");
      setSearchQuery("");
      setFiltersState((prev) => {
        const next = {
          ...EMPTY_TRAINER_FILTERS,
          ...fromUrl,
          zipCode: "",
          city: "",
          neighborhood: "",
        };
        return filtersEqual(prev, next) ? prev : next;
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
        const residual = residualDisplayQueryAfterSearchFilters(
          displayQuery,
          filters
        );
        const nextDisplay = buildDisplayQueryFromSearchFilters(
          nextFilters,
          residual
        );
        setDisplayQuery(nextDisplay);
        setSearchQuery(residual);
        scheduleUrlSync(nextFilters, nextDisplay);
      }
    },
    [scheduleUrlSync, displayQuery, filters]
  );

  /* Header / gate ZIP frames the map via user coordinates — never mirror
   * place names into the search bar or text filters. */
  useEffect(() => {
    if (!hydrated) return;

    function clearMirroredLocationSearch() {
      const zip = loadSavedZipCode();
      const savedLocation = zip ? exploreFiltersFromZipCode(zip) : null;

      setFiltersState((prev) => {
        const currentDisplay = displayQueryRef.current;
        const typedNeighborhood = Boolean(
          prev.neighborhood &&
            currentDisplay
              .toLowerCase()
              .includes(prev.neighborhood.toLowerCase())
        );
        const typedCity = Boolean(
          prev.city &&
            currentDisplay.toLowerCase().includes(prev.city.toLowerCase())
        );

        const mirroredNeighborhood =
          !typedNeighborhood &&
          Boolean(savedLocation?.neighborhood) &&
          prev.neighborhood === savedLocation?.neighborhood;
        const mirroredCityOnly =
          !typedCity &&
          Boolean(savedLocation) &&
          !prev.neighborhood &&
          prev.city === savedLocation?.city &&
          (!prev.zipCode || prev.zipCode === savedLocation?.zipCode);

        const next: TrainerFilters = {
          ...prev,
          zipCode: "",
          city: mirroredNeighborhood || mirroredCityOnly ? "" : prev.city,
          neighborhood: mirroredNeighborhood ? "" : prev.neighborhood,
        };

        const locationStripped =
          savedLocation && !typedNeighborhood && !typedCity
            ? stripLocationLabelsFromQuery(currentDisplay, savedLocation)
            : currentDisplay;
        const filtersChanged = !filtersEqual(prev, next);
        const locationTextRemoved = locationStripped !== currentDisplay;

        if (!filtersChanged && !locationTextRemoved) {
          return prev;
        }

        const residual = residualDisplayQueryAfterSearchFilters(
          locationStripped,
          next
        );
        const nextDisplay = buildDisplayQueryFromSearchFilters(next, residual);

        if (!filtersChanged && nextDisplay === currentDisplay) {
          return prev;
        }

        queueMicrotask(() => {
          setDisplayQuery(nextDisplay);
          setSearchQuery(residual);
          scheduleUrlSyncRef.current(next, nextDisplay);
        });
        return next;
      });
    }

    clearMirroredLocationSearch();
    return subscribeUserLocation(clearMirroredLocationSearch);
  }, [hydrated]);

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
  /** Custom map frame from “Search here”; null = default origin + 12 mi */
  const [mapSearchArea, setMapSearchArea] = useState<ExploreSearchArea | null>(
    null
  );

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

  const defaultSearchArea = useMemo(() => {
    if (!hydrated) return null;
    return resolveDefaultExploreSearchArea(filters, userCoords);
  }, [filters, userCoords, hydrated, coordsKey]);

  const searchOrigin = useMemo(() => {
    if (!defaultSearchArea) return null;
    return {
      latitude: defaultSearchArea.latitude,
      longitude: defaultSearchArea.longitude,
    };
  }, [defaultSearchArea]);

  const originKey = defaultSearchArea
    ? `${defaultSearchArea.latitude.toFixed(4)},${defaultSearchArea.longitude.toFixed(4)},${defaultSearchArea.radiusMiles}`
    : "";

  useEffect(() => {
    setMapSearchArea(null);
  }, [originKey]);

  const activeSearchArea = useMemo(() => {
    if (mapSearchArea) return mapSearchArea;
    return defaultSearchArea ?? defaultExploreSearchArea(searchOrigin);
  }, [mapSearchArea, defaultSearchArea, searchOrigin]);

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

  const { filtered, areaEmpty } = useMemo(() => {
    const catalog = getCatalogTrainers();
    const origin = activeSearchArea
      ? {
          latitude: activeSearchArea.latitude,
          longitude: activeSearchArea.longitude,
        }
      : searchOrigin;
    const radiusMiles = activeSearchArea
      ? activeSearchArea.radiusMiles
      : origin
        ? DEFAULT_EXPLORE_RADIUS_MILES
        : null;
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
    };
  }, [
    getCatalogTrainers,
    filters,
    searchQuery,
    searchOrigin,
    activeSearchArea,
    nearbyExpanded,
    hydrated,
    userCoords,
    coordsKey,
  ]);

  const suggestedTrainers = useMemo(() => {
    if (filtered.length > 0) return [];
    /* Map “Search here” is intentional — empty area stays empty (no filler rail). */
    if (mapSearchArea) return [];
    const catalog = getCatalogTrainers();
    return getSuggestedExploreTrainers(catalog, filters, searchOrigin);
  }, [filtered, mapSearchArea, getCatalogTrainers, filters, searchOrigin]);

  const mapSearchActive = Boolean(mapSearchArea);

  const getExploreMatchCount = useCallback(
    (candidateFilters: TrainerFilters) => {
      const catalog = getCatalogTrainers();
      const area = resolveDefaultExploreSearchArea(
        candidateFilters,
        userCoords
      );
      const origin = area
        ? { latitude: area.latitude, longitude: area.longitude }
        : resolveExploreMapArea(candidateFilters, userCoords);
      return filterExploreTrainersInArea(
        catalog,
        candidateFilters,
        searchQuery,
        origin,
        {
          radiusMiles: area?.radiusMiles ?? (origin ? DEFAULT_EXPLORE_RADIUS_MILES : null),
        }
      ).trainers.length;
    },
    [getCatalogTrainers, searchQuery, userCoords]
  );

  const expandNearbyResults = useCallback(() => {
    setNearbyExpanded(true);
  }, []);

  const applyMapSearchArea = useCallback((area: ExploreSearchArea) => {
    setNearbyExpanded(false);
    setMapSearchArea(area);
  }, []);

  const resetMapSearchArea = useCallback(() => {
    setNearbyExpanded(false);
    setMapSearchArea(null);
  }, []);

  const activeFilterCount = countActiveFilters(filters);
  const activeFilterChips = useMemo(
    () => getActiveFilterChips(filters),
    [filters]
  );
  const hasSearch = Boolean(displayQuery.trim());

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
      const residual = residualDisplayQueryAfterSearchFilters(
        displayQuery,
        filters
      );
      setDisplayQuery(residual);
      setSearchQuery(residual);
      scheduleUrlSync(nextFilters, residual);
    }
  }, [scheduleUrlSync, displayQuery, filters]);

  const submitSearch = useCallback(
    (rawQuery: string) => {
      const applied = applySearchQueryToExploreState(rawQuery, {
        ...filters,
        zipCode: "",
        city: "",
        neighborhood: "",
        profession: "",
        specialty: "",
        gender: "",
        priceMin: "",
        priceMax: "",
      });
      /* Typed gender/price win; otherwise keep drawer / prior values.
       * serviceType stays drawer-only until NL support is added. */
      const nextFilters = {
        ...applied.filters,
        gender: applied.filters.gender || filters.gender,
        priceMin: applied.filters.priceMin || filters.priceMin,
        priceMax: applied.filters.priceMax || filters.priceMax,
        serviceType: filters.serviceType,
      };
      const nextDisplay =
        buildDisplayQueryFromSearchFilters(
          nextFilters,
          applied.residualQuery
        ) || applied.displayQuery;
      setDisplayQuery(nextDisplay);
      setSearchQuery(applied.residualQuery);
      setFiltersState(nextFilters);
      if (nextDisplay.trim()) {
        recordRecentSearch(nextDisplay);
      }
      scheduleUrlSync(nextFilters, nextDisplay);
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
      const label = getFilterChipLabel(filters, key);
      let nextFilters: TrainerFilters | null = null;
      setFiltersState((prev) => {
        nextFilters = removeFilterFromState(prev, key);
        return nextFilters;
      });
      if (!nextFilters) return;

      if (isSearchBarFilterKey(key)) {
        const nextDisplay = label
          ? stripChipLabelFromDisplayQuery(displayQuery, label)
          : residualDisplayQueryAfterSearchFilters(displayQuery, filters);
        const residual = residualDisplayQueryAfterSearchFilters(
          nextDisplay,
          nextFilters
        );
        const syncedDisplay = buildDisplayQueryFromSearchFilters(
          nextFilters,
          residual
        );
        setDisplayQuery(syncedDisplay);
        setSearchQuery(residual);
        scheduleUrlSync(nextFilters, syncedDisplay);
        return;
      }

      scheduleUrlSync(nextFilters, displayQuery);
    },
    [scheduleUrlSync, displayQuery, filters]
  );

  return {
    filters,
    setFilters,
    displayQuery,
    submitSearch,
    mobileFiltersOpen,
    setMobileFiltersOpen,
    filtered,
    areaEmpty,
    nearbyExpanded,
    suggestedTrainers,
    searchOrigin,
    activeSearchArea,
    mapSearchActive,
    applyMapSearchArea,
    resetMapSearchArea,
    expandNearbyResults,
    getExploreMatchCount,
    activeFilterCount,
    activeFilterChips,
    hasSearch,
    clearFilters,
    clearSearch,
    clearAll,
    removeFilter,
  };
}
