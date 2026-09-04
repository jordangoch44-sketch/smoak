"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FoldedMapIcon } from "@/components/ui/icons";
import {
  useProfileSheetOpen,
  useSiteLocationGateOpen,
} from "@/hooks/useProfileSheetOpen";
import { DEFAULT_EXPLORE_RADIUS_MILES } from "@/lib/explore";
import {
  exploreSearchAreasDiffer,
  searchAreaFromMapViewport,
} from "@/lib/explore-map-area";
import { warmTrainerProfileNavigation } from "@/lib/warm-trainer-profile-navigation";
import {
  loadAppleMapKit,
  regionForRadiusMiles,
  type AppleMapKit,
} from "@/lib/apple-maps";
import {
  clusterTrainersForMap,
  buildExploreMapPinHtml,
  type ExploreMapCluster,
} from "@/lib/explore-map-clusters";
import { cn } from "@/lib/utils";
import { ExploreMapBottomCard } from "./ExploreMapBottomCard";
import type { ExploreMapArea, ExploreMapProps } from "./ExploreMapLeaflet";

type MapKitAnnotation = InstanceType<AppleMapKit["Annotation"]>;
type MapKitMap = InstanceType<AppleMapKit["Map"]>;

const FALLBACK_CENTER: ExploreMapArea = {
  latitude: 32.7157,
  longitude: -117.1611,
};

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
function shouldPanToPinApple(
  map: MapKitMap,
  mapkit: AppleMapKit,
  cluster: ExploreMapCluster,
  containerEl: HTMLElement | null,
  annotationEl?: HTMLElement | null
): boolean {
  if (!containerEl) return true;
  const containerRect = containerEl.getBoundingClientRect();
  if (containerRect.width <= 0 || containerRect.height <= 0) return true;

  let relativeX: number | null = null;
  let relativeY: number | null = null;

  // 1. Try MapKit coordinate-to-point if available
  try {
    if (typeof map.convertCoordinateToPointOnPage === "function") {
      const pagePoint = map.convertCoordinateToPointOnPage(
        new mapkit.Coordinate(cluster.latitude, cluster.longitude)
      );
      if (
        pagePoint &&
        typeof pagePoint.x === "number" &&
        typeof pagePoint.y === "number"
      ) {
        relativeX =
          (pagePoint.x - (containerRect.left + window.scrollX)) /
          containerRect.width;
        relativeY =
          (pagePoint.y - (containerRect.top + window.scrollY)) /
          containerRect.height;
      }
    }
  } catch {
    /* fallback to element or region */
  }

  // 2. Try DOM element bounding rect
  if (relativeX === null || relativeY === null) {
    const pinEl =
      annotationEl?.querySelector?.(".explore-map-pin") || annotationEl;
    if (pinEl) {
      const pinRect = pinEl.getBoundingClientRect();
      if (pinRect.width > 0 && pinRect.height > 0) {
        relativeX =
          (pinRect.left + pinRect.width / 2 - containerRect.left) /
          containerRect.width;
        relativeY =
          (pinRect.top + pinRect.height / 2 - containerRect.top) /
          containerRect.height;
      }
    }
  }

  // 3. Fallback to geographic region bounds
  if (relativeX === null || relativeY === null) {
    const region = map.region;
    if (
      region?.center &&
      region?.span &&
      region.span.latitudeDelta > 0 &&
      region.span.longitudeDelta > 0
    ) {
      const north = region.center.latitude + region.span.latitudeDelta / 2;
      const west = region.center.longitude - region.span.longitudeDelta / 2;
      relativeY = (north - cluster.latitude) / region.span.latitudeDelta;
      relativeX = (cluster.longitude - west) / region.span.longitudeDelta;
    }
  }

  // If position couldn't be determined, default to panning
  if (relativeX === null || relativeY === null) return true;

  // Check if pin is in the safe upper viewport (top 8% to 60%, and 8% to 92% horizontally).
  // If so, the pin is unobstructed above the bottom card dock.
  const isClearAndUnobstructed =
    relativeY >= 0.08 &&
    relativeY <= 0.60 &&
    relativeX >= 0.08 &&
    relativeX <= 0.92;

  // Only pan if NOT in the safe upper viewport (e.g. in bottom ~35-40% or near/past edges)
  return !isClearAndUnobstructed;
}

function applyAppleCamera(
  mapkit: AppleMapKit,
  map: MapKitMap,
  origin: ExploreMapArea | null | undefined,
  clusters: ExploreMapCluster[],
  radiusMiles: number,
  pinAnnotations: MapKitAnnotation[]
) {
  if (origin) {
    map.setRegionAnimated(
      regionForRadiusMiles(mapkit, origin, radiusMiles),
      false
    );
    return;
  }
  if (clusters.length === 1) {
    map.setRegionAnimated(
      regionForRadiusMiles(mapkit, clusters[0], 4),
      false
    );
    return;
  }
  if (pinAnnotations.length > 0) {
    map.showItems(pinAnnotations, {
      animate: false,
      padding: { top: 36, right: 36, bottom: 36, left: 36 },
      minimumSpan: new mapkit.CoordinateSpan(0.04, 0.04),
    });
    return;
  }
  map.setRegionAnimated(
    regionForRadiusMiles(mapkit, FALLBACK_CENTER, DEFAULT_EXPLORE_RADIUS_MILES),
    false
  );
}

/**
 * Real Apple Maps (MapKit JS) — dark color scheme.
 * Option B multi-trainer clustering with avatar stack and horizontal carousel callouts.
 */
export function ExploreMapApple({
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
  const stageRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapKitMap | null>(null);
  const mapkitRef = useRef<AppleMapKit | null>(null);
  const pinAnnotationsRef = useRef<MapKitAnnotation[]>([]);
  const meAnnotationRef = useRef<MapKitAnnotation | null>(null);
  const framedOriginRef = useRef<string>("");
  const selectedCoordRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const selectedClusterIdRef = useRef<string | null>(null);
  const pinSelectGuardRef = useRef(0);
  const areaCenterRef = useRef(areaCenter);
  areaCenterRef.current = areaCenter;
  const activeSearchAreaRef = useRef(activeSearchArea);
  activeSearchAreaRef.current = activeSearchArea;
  const onPendingRef = useRef(onPendingSearchAreaChange);
  onPendingRef.current = onPendingSearchAreaChange;
  const suppressUntilRef = useRef(0);
  const [mapEpoch, setMapEpoch] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<ExploreMapCluster | null>(null);
  const profileSheetOpen = useProfileSheetOpen();
  const locationGateOpen = useSiteLocationGateOpen();
  const mapPaused = profileSheetOpen || locationGateOpen;

  const clusters = useMemo(() => {
    return clusterTrainersForMap(trainers);
  }, [trainers]);
  const clustersRef = useRef(clusters);
  clustersRef.current = clusters;

  const trainersRef = useRef(trainers);
  trainersRef.current = trainers;

  const clearSelection = useCallback(() => {
    selectedCoordRef.current = null;
    selectedClusterIdRef.current = null;
    setSelectedCluster(null);
    const map = mapRef.current;
    if (map) map.selectedAnnotation = null;
    const stage = stageRef.current;
    if (stage) {
      stage
        .querySelectorAll(".explore-map-pin--selected")
        .forEach((el) => el.classList.remove("explore-map-pin--selected"));
    }
  }, []);

  const selectCluster = useCallback(
    (cluster: ExploreMapCluster) => {
      pinSelectGuardRef.current = Date.now() + 1000;
      suppressUntilRef.current = Date.now() + 1200;

      const stage = stageRef.current;
      if (stage) {
        stage
          .querySelectorAll(".explore-map-pin--selected")
          .forEach((el) => el.classList.remove("explore-map-pin--selected"));
      }

      selectedCoordRef.current = {
        latitude: cluster.latitude,
        longitude: cluster.longitude,
      };
      selectedClusterIdRef.current = cluster.id;
      setSelectedCluster(cluster);

      const ann = pinAnnotationsRef.current.find(
        (a) => (a.data as { clusterId?: string })?.clusterId === cluster.id
      );
      if (ann?.element) {
        const pinEl = ann.element.querySelector(".explore-map-pin");
        if (pinEl) pinEl.classList.add("explore-map-pin--selected");
      }

      // Conditionally pan camera ONLY if the tapped pin is in the bottom ~35-40% covered by the bottom card or off-screen.
      // If already clearly visible and unobstructed in the upper viewport, keep the map camera stationary.
      const map = mapRef.current;
      const mapkit = mapkitRef.current;
      if (map && mapkit) {
        const ann = pinAnnotationsRef.current.find(
          (a) => (a.data as { clusterId?: string })?.clusterId === cluster.id
        );
        const needsPan = shouldPanToPinApple(
          map,
          mapkit,
          cluster,
          containerRef.current,
          ann?.element
        );

        if (needsPan) {
          const region = map.region;
          const offsetLat = (region.span?.latitudeDelta ?? 0.05) * 0.22;
          map.setCenterAnimated(
            new mapkit.Coordinate(
              cluster.latitude - offsetLat,
              cluster.longitude
            ),
            true
          );
        }
      }
    },
    []
  );

  useEffect(() => {
    const root = stageRef.current;
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
      const href = `/trainers/${encodeURIComponent(
        trainer?.id ?? decodedId
      )}`;

      if (trainer) {
        warmTrainerProfileNavigation(trainer, router);
      }

      clearSelection();
      router.push(href, { scroll: false });
    }

    function onPinClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest(
          ".explore-hub-tray, .explore-map-callout, .explore-map-popup-wrap, .smoac-control"
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
            return;
          }
        }
      }
    }

    /** Tap / drag outside the card or pin dismisses the callout. */
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest(
          ".explore-map-callout, .explore-hub-tray, .explore-bottom-card-dock, .explore-bottom-card, .explore-bottom-card__carousel, .explore-map-cluster-popup__carousel"
        )
      ) {
        return;
      }
      if (target.closest(".explore-map-pin, .explore-map-annotation-wrapper")) {
        pinSelectGuardRef.current = Date.now() + 1000;
        return;
      }
      if (
        target.closest(
          ".explore-map__recenter, .explore-map__search-here, .smoac-control"
        )
      ) {
        return;
      }
      // Let MapKit annotation select / click win if this was actually a pin hit
      window.setTimeout(() => {
        if (Date.now() < pinSelectGuardRef.current) return;
        clearSelection();
      }, 50);
    }

    root.addEventListener("click", onPopupLinkClick, true);
    root.addEventListener("click", onPinClick, true);
    root.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      root.removeEventListener("click", onPopupLinkClick, true);
      root.removeEventListener("click", onPinClick, true);
      root.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [router, clearSelection, selectCluster, mapEpoch]);

  const areaKey = areaCenter
    ? `${areaCenter.latitude.toFixed(4)},${areaCenter.longitude.toFixed(4)}`
    : "";

  const suppressMoves = useCallback((ms = 220) => {
    suppressUntilRef.current = Date.now() + ms;
  }, []);

  const emitPendingFromMap = useCallback((map: MapKitMap) => {
    if (Date.now() < suppressUntilRef.current) return;
    const region = map.region;
    const center = region.center;
    const bounds = region.toBoundingRegion();
    const viewport = searchAreaFromMapViewport(
      center.latitude,
      center.longitude,
      bounds.northLatitude,
      bounds.eastLongitude
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

  const applyLiveCamera = useCallback(() => {
    const mapkit = mapkitRef.current;
    const map = mapRef.current;
    if (!mapkit || !map) return;
    const origin = areaCenterRef.current;
    const currentClusters = clustersRef.current;
    const radius =
      activeSearchAreaRef.current?.radiusMiles ?? DEFAULT_EXPLORE_RADIUS_MILES;
    applyAppleCamera(
      mapkit,
      map,
      origin,
      currentClusters,
      radius,
      pinAnnotationsRef.current
    );
    if (origin) {
      framedOriginRef.current = `${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)}`;
    } else if (currentClusters.length > 0) {
      framedOriginRef.current = clustersFrameKey(currentClusters);
    } else {
      framedOriginRef.current = "waiting";
    }
    window.setTimeout(() => {
      onPendingRef.current?.(null);
    }, 200);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let map: MapKitMap | null = null;

    async function mountMap() {
      if (mapPaused) return;
      const el = containerRef.current;
      if (!el) return;

      try {
        const mapkit = await loadAppleMapKit();
        if (cancelled || mapPaused || !containerRef.current) return;
        mapkitRef.current = mapkit;
        setLoadError(null);

        if (mapRef.current) {
          mapRef.current.destroy();
          mapRef.current = null;
        }
        pinAnnotationsRef.current = [];
        meAnnotationRef.current = null;
        framedOriginRef.current = "";
        clearSelection();

        const origin = areaCenterRef.current;
        const currentClusters = clustersRef.current;
        const start =
          origin ??
          (currentClusters[0]
            ? { latitude: currentClusters[0].latitude, longitude: currentClusters[0].longitude }
            : FALLBACK_CENTER);

        map = new mapkit.Map(el, {
          center: new mapkit.Coordinate(start.latitude, start.longitude),
          colorScheme: mapkit.ColorScheme.Dark,
          isScrollEnabled: !locked,
          isZoomEnabled: !locked,
          isRotationEnabled: false,
          showsZoomControl: !locked,
          showsMapTypeControl: false,
          showsUserLocationControl: false,
          showsCompass: mapkit.FeatureVisibility.Hidden,
          showsScale: mapkit.FeatureVisibility.Hidden,
          showsPointsOfInterest: true,
        });

        mapRef.current = map;
        suppressUntilRef.current = Date.now() + 400;
        applyLiveCamera();
        setMapEpoch((value) => value + 1);

        // User pan/zoom → dismiss callout (don't let it follow the map)
        const onRegionChangeStart = () => {
          if (Date.now() < suppressUntilRef.current) return;
          clearSelection();
        };
        const onRegionChangeEnd = () => {
          if (!mapRef.current) return;
          emitPendingFromMap(mapRef.current);
        };
        map.addEventListener("region-change-start", onRegionChangeStart);
        map.addEventListener("region-change-end", onRegionChangeEnd);
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Could not load Apple Maps";
        setLoadError(message);
      }
    }

    void mountMap();

    return () => {
      cancelled = true;
      framedOriginRef.current = "";
      pinAnnotationsRef.current = [];
      meAnnotationRef.current = null;
      mapkitRef.current = null;
      selectedCoordRef.current = null;
      selectedClusterIdRef.current = null;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      } else if (map) {
        map.destroy();
      }
    };
  }, [
    applyLiveCamera,
    clearSelection,
    emitPendingFromMap,
    locked,
    mapPaused,
    variant,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const mapkit = mapkitRef.current;
    if (!map || !mapkit || mapPaused) return;

    const key = areaCenter ? areaKey : clustersFrameKey(clusters);
    if (framedOriginRef.current === key) return;

    suppressMoves(280);
    applyLiveCamera();
  }, [
    areaCenter,
    areaKey,
    clusters,
    activeSearchArea?.radiusMiles,
    mapPaused,
    mapEpoch,
    applyLiveCamera,
    suppressMoves,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const mapkit = mapkitRef.current;
    if (!map || !mapkit || mapPaused) return;

    if (pinAnnotationsRef.current.length > 0) {
      map.removeAnnotations(pinAnnotationsRef.current);
      pinAnnotationsRef.current = [];
    }
    if (meAnnotationRef.current) {
      map.removeAnnotation(meAnnotationRef.current);
      meAnnotationRef.current = null;
    }

    if (userLocationDot) {
      const me = new mapkit.Annotation(
        new mapkit.Coordinate(
          userLocationDot.latitude,
          userLocationDot.longitude
        ),
        () => {
          const el = document.createElement("div");
          el.className = "explore-map-me";
          el.innerHTML =
            '<span class="explore-map-me__dot" aria-hidden="true">ME</span>';
          return el;
        },
        {
          title: "You",
          calloutEnabled: false,
          animates: false,
          size: { width: 32, height: 32 },
          anchorOffset: new DOMPoint(0, -16),
        }
      );
      map.addAnnotation(me);
      meAnnotationRef.current = me;
    }

    const nextPins: MapKitAnnotation[] = [];
    for (const cluster of clusters) {
      const isMulti = cluster.isMulti;
      const pinHtml = buildExploreMapPinHtml(cluster, false);

      const annotation = new mapkit.Annotation(
        new mapkit.Coordinate(cluster.latitude, cluster.longitude),
        () => {
          const el = document.createElement("div");
          el.className = `explore-map-annotation-wrapper ${isMulti ? "explore-map-annotation-wrapper--cluster" : "explore-map-annotation-wrapper--single"}`;
          el.innerHTML = pinHtml;

          // Direct interaction listeners on the DOM element for instant mobile touch & desktop click response
          el.addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            pinSelectGuardRef.current = Date.now() + 1000;
          });
          el.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectCluster(cluster);
          });
          el.addEventListener("touchend", (e) => {
            e.stopPropagation();
            selectCluster(cluster);
          });

          return el;
        },
        {
          title: isMulti
            ? `${cluster.count} Specialists · ${cluster.locationLabel}`
            : cluster.primaryTrainer.name,
          accessibilityLabel: isMulti
            ? `${cluster.count} Specialists at ${cluster.locationLabel}`
            : cluster.primaryTrainer.name,
          data: { clusterId: cluster.id },
          animates: false,
          size: isMulti ? { width: 88, height: 56 } : { width: 68, height: 38 },
          anchorOffset: isMulti ? new DOMPoint(0, -28) : new DOMPoint(0, -19),
          calloutEnabled: false,
        }
      );

      annotation.addEventListener("select", () => {
        selectCluster(cluster);
      });

      annotation.addEventListener("deselect", () => {
        if (Date.now() < pinSelectGuardRef.current) return;
        const pinEl = annotation.element?.querySelector(".explore-map-pin");
        if (pinEl) pinEl.classList.remove("explore-map-pin--selected");
        if (selectedClusterIdRef.current === cluster.id) {
          clearSelection();
        }
      });

      nextPins.push(annotation);
    }

    if (nextPins.length > 0) {
      map.addAnnotations(nextPins);
    }
    pinAnnotationsRef.current = nextPins;

    if (
      selectedClusterIdRef.current &&
      !clusters.some((c) => c.id === selectedClusterIdRef.current)
    ) {
      clearSelection();
    }
  }, [
    clusters,
    userLocationDot,
    mapPaused,
    mapEpoch,
    selectCluster,
    clearSelection,
  ]);

  const handleRecenter = useCallback(() => {
    if (mapPaused) return;
    if (!mapRef.current || !mapkitRef.current) return;
    suppressMoves(280);
    applyLiveCamera();
    onRecenterSearch?.();
  }, [onRecenterSearch, mapPaused, applyLiveCamera, suppressMoves]);

  const totalMappedTrainers = clusters.reduce((acc, c) => acc + c.count, 0);
  const missing = trainers.length - totalMappedTrainers;
  const showChrome = !locked && !mapPaused;
  const rootClass = [
    "explore-map",
    "explore-map--apple",
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
      <div ref={stageRef} className="explore-map__stage">
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
        {loadError ? (
          <p className="explore-map__load-error" role="alert">
            Apple Maps failed to load. Check your Maps token and allowed
            domains.
          </p>
        ) : null}
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
