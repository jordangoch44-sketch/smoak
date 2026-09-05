"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";
import type { Trainer } from "@/types";
import { FoldedMapIcon } from "@/components/ui/icons";
import {
  useProfileSheetOpen,
  useSiteLocationGateOpen,
} from "@/hooks/useProfileSheetOpen";
import { useExploreMapLayoutEpoch } from "@/hooks/useExploreMapLayoutEpoch";
import { notifyExploreMapLayout } from "@/lib/explore-map-layout";
import { DEFAULT_EXPLORE_RADIUS_MILES } from "@/lib/explore";
import {
  exploreSearchAreasDiffer,
  searchAreaFromMapViewport,
  type ExploreSearchArea,
} from "@/lib/explore-map-area";
import { warmTrainerProfileNavigation } from "@/lib/warm-trainer-profile-navigation";
import { getExploreMapBasemap } from "@/lib/explore-map-tiles";
import {
  clusterTrainersForMap,
  buildExploreMapPinHtml,
  EXPLORE_MAP_CLUSTER_PIN_SIZE,
  EXPLORE_MAP_SINGLE_PIN_SIZE,
  type ExploreMapCluster,
} from "@/lib/explore-map-clusters";
import { ExploreMapBottomCard } from "./ExploreMapBottomCard";
import { cn } from "@/lib/utils";

export type ExploreMapArea = {
  latitude: number;
  longitude: number;
};

export interface ExploreMapProps {
  trainers: Trainer[];
  /** Search / personalization area — frames the map even when pins are sparse */
  areaCenter?: ExploreMapArea | null;
  /**
   * Precise device GPS only. Never ZIP/city centroids, never Search-here center.
   * Null → no “you are here” ME dot.
   */
  userLocationDot?: ExploreMapArea | null;
  /** Active area used for pins + list (default 12 mi around origin) */
  activeSearchArea?: ExploreSearchArea | null;
  /** User moved the map — pending area ready for Search here */
  onPendingSearchAreaChange?: (area: ExploreSearchArea | null) => void;
  /** Recenter camera + reset results to default 12-mile frame */
  onRecenterSearch?: () => void;
  /** Desktop / map chrome — confirm panned viewport */
  showSearchHere?: boolean;
  searchHereLoading?: boolean;
  onSearchHere?: () => void;
  /** Display-only: no drag / zoom (default true) */
  locked?: boolean;
  /** `split` = compact height; `panel` = full map view; `hero` = full-bleed under header; `column` = desktop split rail */
  variant?: "panel" | "split" | "hero" | "column";
  showNotes?: boolean;
}

const FALLBACK_CENTER: ExploreMapArea = {
  latitude: 32.7157,
  longitude: -117.1611,
};

/** @deprecated Prefer DEFAULT_EXPLORE_RADIUS_MILES — kept for existing imports */
export const DEFAULT_EXPLORE_MAP_RADIUS_MILES = DEFAULT_EXPLORE_RADIUS_MILES;
const METERS_PER_MILE = 1609.344;

function frameRadiusMiles(
  map: import("leaflet").Map,
  L: typeof import("leaflet"),
  center: ExploreMapArea,
  radiusMiles: number
) {
  try {
    const circle = L.circle([center.latitude, center.longitude], {
      radius: radiusMiles * METERS_PER_MILE,
      interactive: false,
    });
    map.fitBounds(circle.getBounds(), {
      animate: false,
      padding: [28, 28],
    });
    circle.remove();
  } catch {
    map.setView([center.latitude, center.longitude], 11, { animate: false });
  }
}

function clustersFrameKey(clusters: ExploreMapCluster[]): string {
  if (clusters.length === 0) return "clusters:empty";
  const first = clusters[0];
  const last = clusters[clusters.length - 1];
  return `clusters:${clusters.length}:${first.latitude.toFixed(3)},${first.longitude.toFixed(3)}:${last.latitude.toFixed(3)},${last.longitude.toFixed(3)}`;
}

/**
 * Checks if the tapped pin is already clearly visible and unobstructed in the upper viewport.
 * The bottom ~35-40% of the screen is where the bottom card pops up.
 * Returns true if the map should pan (i.e. pin is in bottom zone or near/past edges).
 */
function shouldPanToPinLeaflet(
  map: import("leaflet").Map,
  cluster: ExploreMapCluster,
  containerEl: HTMLElement | null
): boolean {
  if (!containerEl) return true;
  const size = map.getSize();
  if (size.x <= 0 || size.y <= 0) return true;

  const point = map.latLngToContainerPoint([
    cluster.latitude,
    cluster.longitude,
  ]);
  const relativeX = point.x / size.x;
  const relativeY = point.y / size.y;

  // Check if pin is clearly visible and unobstructed in the upper viewport (top 8% to 60%, 8% to 92% horizontally).
  // The bottom ~35-40% of the screen is where the bottom card pops up and covers the pin.
  const isClearAndUnobstructed =
    relativeY >= 0.08 &&
    relativeY <= 0.60 &&
    relativeX >= 0.08 &&
    relativeX <= 0.92;

  // Only pan if NOT in the safe upper viewport (e.g. in bottom ~35-40% covered by bottom card, or near/off screen edges)
  return !isClearAndUnobstructed;
}

function safeInvalidateMapSize(map: import("leaflet").Map | null | undefined): boolean {
  if (!map) return false;
  const container = map.getContainer?.();
  if (!container?.isConnected) return false;
  const { width, height } = container.getBoundingClientRect();
  if (width <= 0 || height <= 0) return false;
  try {
    map.invalidateSize({ animate: false });
    return true;
  } catch {
    return false;
  }
}

function fitMappedClusters(
  map: import("leaflet").Map,
  L: typeof import("leaflet"),
  clusters: ExploreMapCluster[]
) {
  if (clusters.length === 0) return;
  if (clusters.length === 1) {
    map.setView([clusters[0].latitude, clusters[0].longitude], 12, { animate: false });
    return;
  }
  try {
    const bounds = L.latLngBounds(
      clusters.map((c) => [c.latitude, c.longitude] as [number, number])
    );
    map.fitBounds(bounds, {
      animate: false,
      padding: [36, 36],
      maxZoom: 13,
    });
  } catch {
    map.setView([clusters[0].latitude, clusters[0].longitude], 11, { animate: false });
  }
}

/**
 * Leaflet + OpenFreeMap / CARTO fallback when Apple Maps token is unset.
 */
export function ExploreMapLeaflet({
  trainers,
  areaCenter = null,
  userLocationDot = null,
  activeSearchArea = null,
  onPendingSearchAreaChange,
  onRecenterSearch,
  showSearchHere = false,
  searchHereLoading = false,
  onSearchHere,
  locked = true,
  variant = "panel",
  showNotes = true,
}: ExploreMapProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const areaDotRef = useRef<import("leaflet").Marker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const framedOriginRef = useRef<string>("");
  const areaCenterRef = useRef(areaCenter);
  areaCenterRef.current = areaCenter;
  const activeSearchAreaRef = useRef(activeSearchArea);
  activeSearchAreaRef.current = activeSearchArea;
  const onPendingRef = useRef(onPendingSearchAreaChange);
  onPendingRef.current = onPendingSearchAreaChange;
  /** Ignore moveend until this timestamp (programmatic camera moves) */
  const suppressUntilRef = useRef(0);
  const [mapEpoch, setMapEpoch] = useState(0);
  const [selectedCluster, setSelectedCluster] = useState<ExploreMapCluster | null>(null);
  const selectedClusterIdRef = useRef<string | null>(null);
  const profileSheetOpen = useProfileSheetOpen();
  const locationGateOpen = useSiteLocationGateOpen();
  const mapPaused = profileSheetOpen || locationGateOpen;
  const layoutEpoch = useExploreMapLayoutEpoch();
  const wasPausedRef = useRef(false);

  const clearSelection = useCallback(() => {
    selectedClusterIdRef.current = null;
    setSelectedCluster(null);
    const container = containerRef.current;
    if (container) {
      container
        .querySelectorAll(".explore-map-pin--selected")
        .forEach((el) => el.classList.remove("explore-map-pin--selected"));
    }
  }, []);

  const selectCluster = useCallback(
    (cluster: ExploreMapCluster) => {
      suppressUntilRef.current = Date.now() + 1200;

      const map = mapRef.current;
      if (map) {
        map.closePopup();
      }

      const container = containerRef.current;
      if (container) {
        container
          .querySelectorAll(".explore-map-pin--selected")
          .forEach((el) => el.classList.remove("explore-map-pin--selected"));

        const targetPin = container.querySelector(
          `.explore-map-pin[data-cluster-id="${cluster.id}"]`
        );
        targetPin?.classList.add("explore-map-pin--selected");
      }

      selectedClusterIdRef.current = cluster.id;
      setSelectedCluster(cluster);

      if (map) {
        const needsPan = shouldPanToPinLeaflet(
          map,
          cluster,
          containerRef.current
        );

        if (needsPan) {
          const bounds = map.getBounds();
          const latSpan = bounds.getNorth() - bounds.getSouth();
          const offsetLat = (latSpan || 0.05) * 0.22;
          map.panTo([cluster.latitude - offsetLat, cluster.longitude], {
            animate: true,
            duration: 0.35,
          });
        }
      }
    },
    []
  );

  const clusters = useMemo(() => {
    return clusterTrainersForMap(trainers);
  }, [trainers]);
  const clustersRef = useRef(clusters);
  clustersRef.current = clusters;

  const trainersRef = useRef(trainers);
  trainersRef.current = trainers;

  /*
   * Map popups use raw HTML anchors. Intercept clicks so we soft-navigate like
   * list cards (prime + App Router) instead of a full document load that remounts
   * auth/saves and breaks hearts → Favorites.
   */
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    function onPopupLinkClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a.explore-map-popup__link, a.explore-map-cluster-card__link");
      if (!(link instanceof HTMLAnchorElement)) return;

      const trainerId =
        link.getAttribute("data-trainer-id")?.trim() ||
        link.pathname.split("/trainers/")[1]?.split(/[/?#]/)[0]?.trim() ||
        "";
      if (!trainerId) return;

      event.preventDefault();
      event.stopPropagation();

      const decodedId = decodeURIComponent(trainerId);
      const trainer = trainersRef.current.find((t) => t.id === decodedId);
      const href = `/trainers/${encodeURIComponent(trainer?.id ?? decodedId)}`;

      if (trainer) {
        warmTrainerProfileNavigation(trainer, router);
      }

      mapRef.current?.closePopup();
      router.push(href, { scroll: false });
    }

    function onContainerClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest(
          ".explore-hub-tray, .leaflet-popup, .smoac-control"
        )
      ) {
        return;
      }

      const pinEl = target.closest<HTMLElement>(".explore-map-pin");
      if (pinEl) {
        const clusterId = pinEl.getAttribute("data-cluster-id");
        if (clusterId) {
          const cluster = clustersRef.current.find((c) => c.id === clusterId);
          if (cluster) {
            event.preventDefault();
            event.stopPropagation();
            selectCluster(cluster);
          }
        }
      }
    }

    root.addEventListener("click", onPopupLinkClick, true);
    root.addEventListener("click", onContainerClick, true);
    return () => {
      root.removeEventListener("click", onPopupLinkClick, true);
      root.removeEventListener("click", onContainerClick, true);
    };
  }, [router, selectCluster]);

  const areaKey = areaCenter
    ? `${areaCenter.latitude.toFixed(4)},${areaCenter.longitude.toFixed(4)}`
    : "";

  const suppressMoves = useCallback((ms = 220) => {
    suppressUntilRef.current = Date.now() + ms;
  }, []);

  const emitPendingFromMap = useCallback((map: import("leaflet").Map) => {
    if (Date.now() < suppressUntilRef.current) return;
    const center = map.getCenter();
    const ne = map.getBounds().getNorthEast();
    const viewport = searchAreaFromMapViewport(
      center.lat,
      center.lng,
      ne.lat,
      ne.lng
    );
    const active = activeSearchAreaRef.current;
    const notify = onPendingRef.current;
    if (!notify) return;
    if (active && !exploreSearchAreasDiffer(viewport, active)) {
      notify(null);
      return;
    }
    notify(viewport);
  }, []);

  const applyLiveCamera = useCallback(
    (map: import("leaflet").Map, L: typeof import("leaflet")) => {
      const origin = areaCenterRef.current;
      const currentClusters = clustersRef.current;
      if (origin) {
        const radius =
          activeSearchAreaRef.current?.radiusMiles ??
          DEFAULT_EXPLORE_RADIUS_MILES;
        frameRadiusMiles(map, L, origin, radius);
        framedOriginRef.current = `${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)}`;
      } else if (currentClusters.length > 0) {
        fitMappedClusters(map, L, currentClusters);
        framedOriginRef.current = clustersFrameKey(currentClusters);
      } else {
        framedOriginRef.current = "waiting";
      }
      window.setTimeout(() => {
        onPendingRef.current?.(null);
      }, 200);
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | null = null;
    const invalidateTimeouts: number[] = [];

    async function mountMap() {
      const el = containerRef.current;
      if (!el) return;

      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersLayerRef.current = null;
      areaDotRef.current = null;
      framedOriginRef.current = "";

      const origin = areaCenterRef.current;
      const currentClusters = clustersRef.current;
      const start =
        origin ??
        (currentClusters[0]
          ? { latitude: currentClusters[0].latitude, longitude: currentClusters[0].longitude }
          : FALLBACK_CENTER);
      leafletRef.current = L;

      map = L.map(el, {
        center: [start.latitude, start.longitude],
        zoom: 11,
        zoomControl: false,
        attributionControl: true,
        dragging: !locked,
        touchZoom: !locked,
        doubleClickZoom: !locked,
        scrollWheelZoom: !locked,
        boxZoom: !locked,
        keyboard: !locked,
      });

      if (!locked) {
        L.control.zoom({ position: "topright" }).addTo(map);
      }

      const basemap = getExploreMapBasemap();
      L.tileLayer(basemap.url, {
        maxZoom: basemap.maxZoom,
        detectRetina: basemap.detectRetina ?? false,
        ...(basemap.subdomains ? { subdomains: basemap.subdomains } : {}),
        className: `explore-map-tiles ${basemap.tileModifierClass}`,
        attribution: basemap.attribution,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      suppressUntilRef.current = Date.now() + 400;
      applyLiveCamera(map, L);

      setMapEpoch((value) => value + 1);

      const onMoveEnd = () => {
        emitPendingFromMap(map!);
      };
      const onMoveStart = () => {
        if (Date.now() < suppressUntilRef.current) return;
        clearSelection();
      };
      const onMapClick = () => {
        if (Date.now() < suppressUntilRef.current) return;
        clearSelection();
      };

      map.on("moveend", onMoveEnd);
      map.on("movestart", onMoveStart);
      map.on("dragstart", onMoveStart);
      map.on("click", onMapClick);

      invalidateTimeouts.push(
        window.setTimeout(() => {
          if (cancelled || mapRef.current !== map || !map) return;
          if (!safeInvalidateMapSize(map)) return;
          if (leafletRef.current) {
            suppressUntilRef.current = Date.now() + 320;
            applyLiveCamera(map, leafletRef.current);
          }
        }, 80)
      );
      invalidateTimeouts.push(
        window.setTimeout(() => {
          if (cancelled || mapRef.current !== map || !map) return;
          safeInvalidateMapSize(map);
        }, 320)
      );
    }

    void mountMap();

    return () => {
      cancelled = true;
      for (const timeoutId of invalidateTimeouts) {
        window.clearTimeout(timeoutId);
      }
      framedOriginRef.current = "";
      markersLayerRef.current = null;
      areaDotRef.current = null;
      leafletRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      } else if (map) {
        map.remove();
      }
    };
  }, [applyLiveCamera, emitPendingFromMap, locked, variant]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const enable = !locked && !mapPaused;
    if (enable) {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
    } else {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
    }
    if (wasPausedRef.current && !mapPaused) {
      safeInvalidateMapSize(map);
      notifyExploreMapLayout();
    }
    wasPausedRef.current = mapPaused;
  }, [locked, mapPaused, mapEpoch]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      safeInvalidateMapSize(mapRef.current);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [mapEpoch, variant, layoutEpoch]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || mapPaused) return;

    const key = areaCenter
      ? areaKey
      : clustersFrameKey(clusters);
    if (framedOriginRef.current === key) return;

    suppressMoves(280);
    applyLiveCamera(map, L);
  }, [
    areaCenter,
    areaKey,
    clusters,
    activeSearchArea?.radiusMiles,
    mapPaused,
    mapEpoch,
    layoutEpoch,
    applyLiveCamera,
    suppressMoves,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    const layer = markersLayerRef.current;
    if (!map || !L || !layer) return;

    layer.clearLayers();
    if (areaDotRef.current) {
      areaDotRef.current.remove();
      areaDotRef.current = null;
    }

    if (userLocationDot) {
      const meIcon = L.divIcon({
        className: "explore-map-me",
        html: '<span class="explore-map-me__dot" aria-hidden="true">ME</span>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      areaDotRef.current = L.marker(
        [userLocationDot.latitude, userLocationDot.longitude],
        {
          icon: meIcon,
          interactive: false,
          keyboard: false,
          zIndexOffset: 600,
        }
      ).addTo(map);
    }

    for (const cluster of clusters) {
      const isMulti = cluster.isMulti;
      const pinHtml = buildExploreMapPinHtml(cluster, false);
      const pinSize = isMulti
        ? EXPLORE_MAP_CLUSTER_PIN_SIZE
        : EXPLORE_MAP_SINGLE_PIN_SIZE;
      const iconSize: [number, number] = [pinSize.width, pinSize.height];
      const iconAnchor: [number, number] = [pinSize.width / 2, pinSize.height];

      const pinIcon = L.divIcon({
        className: `explore-map-marker-container ${isMulti ? "explore-map-marker--cluster" : "explore-map-marker--single"}`,
        html: pinHtml,
        iconSize,
        iconAnchor,
      });

      const title = isMulti
        ? `${cluster.count} Specialists · ${cluster.locationLabel}`
        : cluster.primaryTrainer.name;

      const marker = L.marker([cluster.latitude, cluster.longitude], {
        icon: pinIcon,
        title,
      });

      const handlePinSelect = (e?: unknown) => {
        if (e && typeof e === "object" && "stopPropagation" in e) {
          (e as { stopPropagation: () => void }).stopPropagation();
        }
        selectCluster(cluster);
      };

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        handlePinSelect(e);
      });

      marker.on("add", () => {
        const el = marker.getElement();
        if (!el) return;
        L.DomEvent.disableClickPropagation(el);
        el.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          handlePinSelect(e);
        });
        el.addEventListener("touchend", (e) => {
          e.stopPropagation();
          handlePinSelect(e);
        });
      });

      layer.addLayer(marker);
    }
  }, [clusters, userLocationDot, mapEpoch, selectCluster]);

  useEffect(() => {
    safeInvalidateMapSize(mapRef.current);
  }, [layoutEpoch]);

  const handleRecenter = useCallback(() => {
    if (mapPaused) return;
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;
    suppressMoves(280);
    applyLiveCamera(map, L);
    onRecenterSearch?.();
  }, [onRecenterSearch, mapPaused, applyLiveCamera, suppressMoves]);

  const totalMappedTrainers = clusters.reduce((acc, c) => acc + c.count, 0);
  const missing = trainers.length - totalMappedTrainers;
  const showChrome = !locked && !mapPaused;
  const rootClass = [
    "explore-map",
    variant === "hero"
      ? "explore-map--hero"
      : variant === "split"
        ? "explore-map--split"
        : variant === "column"
          ? "explore-map--column"
          : "explore-map--panel",
    locked ? "explore-map--locked" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      <div className="explore-map__stage">
        <div
          ref={containerRef}
          className="explore-map__canvas"
          role="img"
          aria-label="Map of specialists in this search area"
        />
        <ExploreMapBottomCard
          cluster={selectedCluster}
          onClose={clearSelection}
        />
        {showChrome ? (
          <>
            <button
              type="button"
              className={cn(
                "smoac-control explore-map__recenter",
                variant === "hero" && "explore-map__recenter--hero"
              )}
              onClick={handleRecenter}
              aria-label="Recenter map to your 12-mile search area"
            >
              <FoldedMapIcon className="explore-map__recenter-icon" />
            </button>
            {showSearchHere ? (
              <button
                type="button"
                className="smoac-control explore-split__search-here explore-map__search-here"
                disabled={searchHereLoading || !onSearchHere}
                onClick={onSearchHere}
              >
                <span className="explore-split__search-here__label">
                  {searchHereLoading ? "Searching…" : "Search here"}
                </span>
              </button>
            ) : null}
          </>
        ) : null}
      </div>
      {showNotes ? (
        clusters.length === 0 ? (
          <p className="explore-map__empty">
            {areaCenter
              ? "Showing your search area. Specialist pins appear when a city or ZIP can be resolved — profiles are unchanged."
              : "No mappable locations in these results yet. Specialists appear here once a city or ZIP can be resolved — profiles are unchanged."}
          </p>
        ) : missing > 0 ? (
          <p className="explore-map__note">
            Showing {totalMappedTrainers} of {trainers.length} on the map
            {missing === 1
              ? " · 1 without a resolvable location"
              : ` · ${missing} without a resolvable location`}
            .
          </p>
        ) : (
          <p className="explore-map__note">
            {totalMappedTrainers} specialist{totalMappedTrainers === 1 ? "" : "s"} in this
            area.
          </p>
        )
      ) : null}
    </div>
  );
}
