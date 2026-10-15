"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useExplicitUserCoordinates } from "@/hooks/useActiveUserCoordinates";
import { FoldedMapIcon } from "@/components/ui/icons";
import {
  useProfileSheetOpen,
  useSiteLocationGateOpen,
} from "@/hooks/useProfileSheetOpen";
import { useExploreMapLayoutEpoch } from "@/hooks/useExploreMapLayoutEpoch";
import { notifyExploreMapLayout } from "@/lib/explore-map-layout";
import { DEFAULT_EXPLORE_RADIUS_MILES } from "@/lib/explore";
import { defaultMarketplaceCenter } from "@/lib/marketplace-city-centers";
import {
  exploreSearchAreasDiffer,
  searchAreaFromMapViewport,
} from "@/lib/explore-map-area";
import {
  warmExploreMapCluster,
} from "@/lib/warm-trainer-profile-navigation";
import { bindExploreMapPopupProfileNav } from "@/lib/explore-map-profile-nav";
import {
  fetchDrivingRoute,
  midpointAlongPath,
} from "@/lib/apple-directions";
import {
  loadAppleMapKit,
  regionForRadiusMiles,
  type AppleMapKit,
} from "@/lib/apple-maps";
import {
  formatDistanceMiles,
  publishDrivingMiles,
} from "@/lib/driving-distance";
import {
  clusterTrainersForMap,
  clustersPinSignature,
  bindExploreMapPinSelect,
  buildExploreMapPinHtml,
  EXPLORE_MAP_CLUSTER_PIN_SIZE,
  EXPLORE_MAP_SINGLE_PIN_SIZE,
  type ExploreMapCluster,
} from "@/lib/explore-map-clusters";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { cn } from "@/lib/utils";
import { ExploreMapBottomCard } from "./ExploreMapBottomCard";
import { ExploreMapSearchRing } from "./ExploreMapSearchRing";
import type { ExploreMapArea, ExploreMapProps } from "./ExploreMapLeaflet";

type MapKitAnnotation = InstanceType<AppleMapKit["Annotation"]>;
type MapKitMap = InstanceType<AppleMapKit["Map"]>;
type MapKitOverlay = InstanceType<AppleMapKit["PolylineOverlay"]>;

const FALLBACK_CENTER: ExploreMapArea = defaultMarketplaceCenter();

/** Clear space between the search bar and the specialist card. */
function routeFrameInsets(container: HTMLElement): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  const bounds = container.getBoundingClientRect();
  const reservedBottom = Math.round(Math.max(210, bounds.height * 0.38));
  let top = 96;
  let bottom = reservedBottom;
  const controls = document.querySelector(
    ".explore-map-hero__controls, .explore-page__map-rail-controls"
  );
  if (controls instanceof HTMLElement) {
    const covered = controls.getBoundingClientRect().bottom - bounds.top;
    if (covered > 0) top = Math.round(covered + 56);
  }
  const card = document.querySelector(".explore-bottom-card-dock");
  if (card instanceof HTMLElement) {
    const covered = bounds.bottom - card.getBoundingClientRect().top;
    if (covered > reservedBottom * 0.55) {
      bottom = Math.round(covered + 56);
    }
  }
  return { top, right: 72, bottom, left: 72 };
}

/** Keep the ME pin and the specialist pin inside the open map, with room around them. */
function paddingForRouteFrame(
  mapkit: AppleMapKit,
  container: HTMLElement
) {
  const insets = routeFrameInsets(container);
  const height = Math.max(container.clientHeight, 1);
  const maxVertical = height * 0.7;
  const vertical = insets.top + insets.bottom;
  const scale = vertical > maxVertical ? maxVertical / vertical : 1;
  return new mapkit.Padding(
    Math.round(insets.top * scale),
    insets.right,
    Math.round(insets.bottom * scale),
    insets.left
  );
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
 * MapKit JS sizes .mk-map-view with height: 100%, which stays 0px inside a
 * flex column unless CSS absolutely fills the canvas. After a real size
 * change, pin the view to the canvas box and reassign region so tiles load
 * (Leaflet’s invalidateSize equivalent). Do not fake window.resize — MapKit
 * ignores it when innerWidth/innerHeight did not change.
 */
function recaptureAppleMapSize(
  map: MapKitMap | null | undefined,
  container: HTMLElement | null | undefined,
  lastSizeKey: { current: string },
  suppressUntil?: { current: number }
): boolean {
  if (!map || !container?.isConnected) return false;
  const { width, height } = container.getBoundingClientRect();
  if (width <= 0 || height <= 0) return false;
  const key = `${Math.round(width)}x${Math.round(height)}`;
  if (key === lastSizeKey.current) return false;
  lastSizeKey.current = key;
  if (suppressUntil) suppressUntil.current = Date.now() + 280;
  const view = container.querySelector<HTMLElement>(".mk-map-view");
  if (view) {
    view.style.width = `${Math.round(width)}px`;
    view.style.height = `${Math.round(height)}px`;
  }
  try {
    const region = map.region;
    if (region) map.region = region;
    return true;
  } catch {
    lastSizeKey.current = "";
    return false;
  }
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
  onMapSearchStart,
  searchLoading = false,
  onRecenterSearch,
  locked = true,
  variant = "panel",
  showNotes = true,
}: ExploreMapProps) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const stageRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapKitMap | null>(null);
  const mapkitRef = useRef<AppleMapKit | null>(null);
  const pinAnnotationsRef = useRef<MapKitAnnotation[]>([]);
  const meAnnotationRef = useRef<MapKitAnnotation | null>(null);
  const routeOverlaysRef = useRef<MapKitOverlay[]>([]);
  const routeLabelRef = useRef<MapKitAnnotation | null>(null);
  const routeOriginMarkRef = useRef<MapKitAnnotation | null>(null);
  const routeFitUntilRef = useRef(0);
  const routeCameraMovesRef = useRef(0);
  const routeRequestRef = useRef(0);
  const framedOriginRef = useRef<string>("");
  const selectedCoordRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const selectedClusterIdRef = useRef<string | null>(null);
  const pinSelectGuardRef = useRef(0);
  const pinPressRef = useRef<{
    x: number;
    y: number;
    clusterId: string;
  } | null>(null);
  const areaCenterRef = useRef(areaCenter);
  areaCenterRef.current = areaCenter;
  const activeSearchAreaRef = useRef(activeSearchArea);
  activeSearchAreaRef.current = activeSearchArea;
  const onPendingRef = useRef(onPendingSearchAreaChange);
  onPendingRef.current = onPendingSearchAreaChange;
  const onMapSearchStartRef = useRef(onMapSearchStart);
  onMapSearchStartRef.current = onMapSearchStart;
  const suppressUntilRef = useRef(0);
  const [mapEpoch, setMapEpoch] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<ExploreMapCluster | null>(null);
  const routeOrigin = useExplicitUserCoordinates();
  const pinsSignatureRef = useRef("");
  const profileSheetOpen = useProfileSheetOpen();
  const locationGateOpen = useSiteLocationGateOpen();
  const mapPaused = profileSheetOpen || locationGateOpen;
  const layoutEpoch = useExploreMapLayoutEpoch();
  const wasPausedRef = useRef(false);
  const mapSizeKeyRef = useRef("");

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
      if (selectedClusterIdRef.current === cluster.id) return;

      pinSelectGuardRef.current = Date.now() + 1000;
      suppressUntilRef.current = Date.now() + 1200;
      selectedCoordRef.current = {
        latitude: cluster.latitude,
        longitude: cluster.longitude,
      };
      selectedClusterIdRef.current = cluster.id;
      setSelectedCluster(cluster);
      warmExploreMapCluster(cluster, routerRef.current);

      const stage = stageRef.current;
      if (stage) {
        stage
          .querySelectorAll(".explore-map-pin--selected")
          .forEach((el) => el.classList.remove("explore-map-pin--selected"));
      }

      const ann = pinAnnotationsRef.current.find(
        (a) => (a.data as { clusterId?: string })?.clusterId === cluster.id
      );
      if (ann?.element) {
        const pinEl = ann.element.querySelector(".explore-map-pin");
        if (pinEl) pinEl.classList.add("explore-map-pin--selected");
      }

      // Instant pan only when the card would cover the pin — never animate against the card.
      const map = mapRef.current;
      const mapkit = mapkitRef.current;
      if (map && mapkit) {
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
            false
          );
        }
      }
    },
    []
  );

  useEffect(() => {
    const root = stageRef.current;
    if (!root) return;

    function onPinActivate(event: Event) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest(
          ".explore-map-callout, .explore-map-popup-wrap, .explore-bottom-card-dock, .smoac-control"
        )
      ) {
        return;
      }
      if (
        event instanceof PointerEvent &&
        event.pointerType === "mouse" &&
        event.button !== 0
      ) {
        return;
      }

      const pinEl = target.closest<HTMLElement>(".explore-map-pin");
      const clusterId =
        pinEl?.getAttribute("data-cluster-id") ??
        pinPressRef.current?.clusterId ??
        null;
      if (!clusterId) return;

      if (event instanceof PointerEvent) {
        const press = pinPressRef.current;
        if (
          press &&
          Math.hypot(event.clientX - press.x, event.clientY - press.y) > 12
        ) {
          pinPressRef.current = null;
          return;
        }
      }
      pinPressRef.current = null;

      const cluster = clustersRef.current.find((c) => c.id === clusterId);
      if (!cluster) return;
      event.preventDefault();
      event.stopPropagation();
      selectCluster(cluster);
    }

    /** Tap / drag outside the card or pin dismisses the callout. */
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest(
          ".explore-map-callout, .explore-map-route-miles, .explore-bottom-card-dock, .explore-bottom-card, .explore-bottom-card__carousel, .explore-map-cluster-popup__carousel"
        )
      ) {
        return;
      }
      if (target.closest(".explore-map-pin, .explore-map-annotation-wrapper")) {
        pinSelectGuardRef.current = Date.now() + 1000;
        const pinEl = target.closest<HTMLElement>(".explore-map-pin");
        const clusterId = pinEl?.getAttribute("data-cluster-id");
        if (clusterId) {
          pinPressRef.current = {
            x: event.clientX,
            y: event.clientY,
            clusterId,
          };
          const cluster = clustersRef.current.find((c) => c.id === clusterId);
          if (cluster) warmExploreMapCluster(cluster, routerRef.current);
        }
        return;
      }
      pinPressRef.current = null;
      if (
        target.closest(
          ".explore-map__recenter, .smoac-control"
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

    const unbindPopupNav = bindExploreMapPopupProfileNav(
      root,
      () => trainersRef.current,
      router,
      clearSelection
    );
    root.addEventListener("pointerup", onPinActivate, true);
    root.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      unbindPopupNav();
      root.removeEventListener("pointerup", onPinActivate, true);
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
    suppressUntilRef.current = Date.now() + 1000;
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
      const el = containerRef.current;
      if (!el) return;

      try {
        const mapkit = await loadAppleMapKit();
        if (cancelled || !containerRef.current) return;
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
          isScrollEnabled: !locked && !mapPaused,
          isZoomEnabled: !locked && !mapPaused,
          isRotationEnabled: false,
          showsZoomControl: !locked,
          showsMapTypeControl: false,
          showsUserLocationControl: false,
          showsCompass: mapkit.FeatureVisibility.Hidden,
          showsScale: mapkit.FeatureVisibility.Hidden,
          showsPointsOfInterest: true,
        });

        mapRef.current = map;
        mapSizeKeyRef.current = "";
        suppressUntilRef.current = Date.now() + 400;
        applyLiveCamera();
        recaptureAppleMapSize(map, el, mapSizeKeyRef, suppressUntilRef);
        setMapEpoch((value) => value + 1);

        // User pan/zoom → dismiss callout (don't let it follow the map)
        const onRegionChangeStart = () => {
          if (
            routeCameraMovesRef.current > 0 ||
            Date.now() < suppressUntilRef.current ||
            Date.now() < routeFitUntilRef.current
          ) {
            return;
          }
          clearSelection();
          onMapSearchStartRef.current?.();
        };
        const onRegionChangeEnd = () => {
          if (!mapRef.current) return;
          if (routeCameraMovesRef.current > 0) {
            routeCameraMovesRef.current -= 1;
            routeFitUntilRef.current = Date.now() + 700;
            return;
          }
          if (Date.now() < routeFitUntilRef.current) return;
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
    variant,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const enable = !locked && !mapPaused;
    map.isScrollEnabled = enable;
    map.isZoomEnabled = enable;
    if (wasPausedRef.current && !mapPaused) {
      mapSizeKeyRef.current = "";
      recaptureAppleMapSize(
        map,
        containerRef.current,
        mapSizeKeyRef,
        suppressUntilRef
      );
      notifyExploreMapLayout();
    }
    wasPausedRef.current = mapPaused;
  }, [locked, mapPaused, mapEpoch]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      const map = mapRef.current;
      if (!map) return;
      recaptureAppleMapSize(map, el, mapSizeKeyRef, suppressUntilRef);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [mapEpoch, variant, layoutEpoch]);

  useEffect(() => {
    recaptureAppleMapSize(
      mapRef.current,
      containerRef.current,
      mapSizeKeyRef,
      suppressUntilRef
    );
  }, [layoutEpoch]);

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
    if (!map || !mapkit) return;

    const meKey = userLocationDot
      ? `me:${userLocationDot.latitude.toFixed(4)},${userLocationDot.longitude.toFixed(4)}`
      : "me:none";
    const signature = `${mapEpoch}|${clustersPinSignature(clusters)}|${meKey}`;
    if (pinsSignatureRef.current === signature) return;
    pinsSignatureRef.current = signature;

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
          anchorOffset: new DOMPoint(0, 0),
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

          bindExploreMapPinSelect(
            el,
            () => selectCluster(cluster),
            () => {
              pinSelectGuardRef.current = Date.now() + 1000;
              warmExploreMapCluster(cluster, routerRef.current);
            }
          );

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
          size: isMulti
            ? EXPLORE_MAP_CLUSTER_PIN_SIZE
            : EXPLORE_MAP_SINGLE_PIN_SIZE,
          anchorOffset: isMulti
            ? new DOMPoint(0, -EXPLORE_MAP_CLUSTER_PIN_SIZE.height / 2)
            : new DOMPoint(0, -EXPLORE_MAP_SINGLE_PIN_SIZE.height / 2),
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
    mapEpoch,
    selectCluster,
    clearSelection,
  ]);

  const selectedClusterRef = useRef(selectedCluster);
  selectedClusterRef.current = selectedCluster;
  const routeOriginRef = useRef(routeOrigin);
  routeOriginRef.current = routeOrigin;
  const selectedRouteKey = selectedCluster
    ? `${selectedCluster.id}:${selectedCluster.latitude.toFixed(5)},${selectedCluster.longitude.toFixed(5)}`
    : "";
  const routeOriginKey = routeOrigin
    ? `${routeOrigin.latitude.toFixed(4)},${routeOrigin.longitude.toFixed(4)}`
    : "";

  useEffect(() => {
    const map = mapRef.current;
    const mapkit = mapkitRef.current;
    const cluster = selectedClusterRef.current;
    const origin = routeOriginRef.current;

    function clearRouteGraphics() {
      const liveMap = mapRef.current;
      if (routeOverlaysRef.current.length > 0 && liveMap) {
        try {
          liveMap.removeOverlays(routeOverlaysRef.current);
        } catch {
          /* map already destroyed */
        }
      }
      routeOverlaysRef.current = [];
      if (routeLabelRef.current && liveMap) {
        try {
          liveMap.removeAnnotation(routeLabelRef.current);
        } catch {
          /* map already destroyed */
        }
      }
      routeLabelRef.current = null;
      if (routeOriginMarkRef.current && liveMap) {
        try {
          liveMap.removeAnnotation(routeOriginMarkRef.current);
        } catch {
          /* map already destroyed */
        }
      }
      routeOriginMarkRef.current = null;
    }

    if (!map || !mapkit || !cluster || !origin) {
      clearRouteGraphics();
      return;
    }

    const requestId = routeRequestRef.current + 1;
    routeRequestRef.current = requestId;
    const controller = new AbortController();
    clearRouteGraphics();

    void (async () => {
      try {
        const route = await fetchDrivingRoute(
          mapkit,
          origin,
          { latitude: cluster.latitude, longitude: cluster.longitude },
          controller.signal
        );
        if (requestId !== routeRequestRef.current) return;
        const liveMap = mapRef.current;
        const liveMapkit = mapkitRef.current;
        if (!route || !liveMap || !liveMapkit) return;

        const casing = new liveMapkit.PolylineOverlay(route.points, {
          enabled: false,
          style: new liveMapkit.Style({
            strokeColor: "#041018",
            strokeOpacity: 0.55,
            lineWidth: 9,
            lineCap: "round",
            lineJoin: "round",
          }),
        });
        const line = new liveMapkit.PolylineOverlay(route.points, {
          enabled: false,
          style: new liveMapkit.Style({
            strokeColor: "#0A84FF",
            lineWidth: 5,
            lineCap: "round",
            lineJoin: "round",
          }),
        });
        liveMap.addOverlays([casing, line]);
        routeOverlaysRef.current = [casing, line];

        const milesLabel = formatDistanceMiles(route.miles);
        const labelPoint = midpointAlongPath(route.points);
        const labelWidth = Math.max(118, Math.ceil(milesLabel.length * 8.6) + 18);
        const label = new liveMapkit.Annotation(
          new liveMapkit.Coordinate(labelPoint.latitude, labelPoint.longitude),
          () => {
            const el = document.createElement("div");
            el.className = "explore-map-route-miles";
            el.textContent = milesLabel;
            return el;
          },
          {
            title: milesLabel,
            accessibilityLabel: `${milesLabel} by car`,
            calloutEnabled: false,
            animates: false,
            size: { width: labelWidth, height: 32 },
            anchorOffset: new DOMPoint(0, -10),
          }
        );
        liveMap.addAnnotation(label);
        routeLabelRef.current = label;

        publishDrivingMiles(
          origin,
          cluster.trainers.map((trainer) => trainer.id),
          route.miles,
          "route"
        );

        await new Promise((resolve) => window.setTimeout(resolve, 280));
        if (requestId !== routeRequestRef.current) return;
        const container = containerRef.current;
        const specialistPin = pinAnnotationsRef.current.find(
          (annotation) =>
            (annotation.data as { clusterId?: string })?.clusterId === cluster.id
        );
        const frameItems = [line, label];
        if (meAnnotationRef.current) frameItems.push(meAnnotationRef.current);
        if (specialistPin) frameItems.push(specialistPin);
        if (!meAnnotationRef.current) {
          const originMark = new liveMapkit.Annotation(
            new liveMapkit.Coordinate(origin.latitude, origin.longitude),
            () => document.createElement("div"),
            {
              size: { width: 28, height: 28 },
              calloutEnabled: false,
              animates: false,
            }
          );
          liveMap.addAnnotation(originMark);
          routeOriginMarkRef.current = originMark;
          frameItems.push(originMark);
        }
        routeCameraMovesRef.current += 1;
        routeFitUntilRef.current = Date.now() + 3200;
        suppressUntilRef.current = Date.now() + 3200;
        window.setTimeout(() => {
          routeCameraMovesRef.current = 0;
        }, 3400);
        if (container) {
          liveMap.showItems(frameItems, {
            animate: false,
            padding: paddingForRouteFrame(liveMapkit, container),
          });
          const endpoints = [
            origin,
            { latitude: cluster.latitude, longitude: cluster.longitude },
          ];
          const meCoordinate = meAnnotationRef.current?.coordinate;
          if (
            meCoordinate &&
            Number.isFinite(meCoordinate.latitude) &&
            Number.isFinite(meCoordinate.longitude)
          ) {
            endpoints.push({
              latitude: meCoordinate.latitude,
              longitude: meCoordinate.longitude,
            });
          }
          const north = Math.max(...endpoints.map((point) => point.latitude));
          const south = Math.min(...endpoints.map((point) => point.latitude));
          const east = Math.max(...endpoints.map((point) => point.longitude));
          const west = Math.min(...endpoints.map((point) => point.longitude));
          window.setTimeout(() => {
            if (requestId !== routeRequestRef.current) return;
            const settledMap = mapRef.current;
            const settledKit = mapkitRef.current;
            const settledContainer = containerRef.current;
            if (!settledMap || !settledKit || !settledContainer) return;
            const insets = routeFrameInsets(settledContainer);
            const height = Math.max(settledContainer.clientHeight, 1);
            const width = Math.max(settledContainer.clientWidth, 1);
            const maxVertical = height * 0.7;
            const vertical = insets.top + insets.bottom;
            const scale = vertical > maxVertical ? maxVertical / vertical : 1;
            const top = insets.top * scale;
            const bottom = insets.bottom * scale;
            const visibleH = Math.max(160, height - top - bottom);
            const visibleW = Math.max(160, width - insets.left - insets.right);
            const span = settledMap.region.span;
            const centerLat =
              (north + south) / 2 -
              (0.5 - (top + visibleH / 2) / height) * span.latitudeDelta;
            const centerLng =
              (east + west) / 2 -
              ((insets.left + visibleW / 2) / width - 0.5) *
                span.longitudeDelta;
            routeCameraMovesRef.current += 1;
            settledMap.setCenterAnimated(
              new settledKit.Coordinate(centerLat, centerLng),
              false
            );
          }, 450);
        }
      } catch {
        /* Keep the pin selected. Cards stay on the last known miles. */
      }
    })();

    return () => {
      controller.abort();
      if (routeRequestRef.current === requestId) {
        clearRouteGraphics();
      }
    };
  }, [selectedRouteKey, routeOriginKey, mapEpoch]);

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
        {searchLoading ? <ExploreMapSearchRing /> : null}
        {loadError ? (
          <p className="explore-map__load-error" role="alert">
            Apple Maps failed to load. Check your Maps token and allowed
            domains.
          </p>
        ) : null}
        {showChrome ? (
          <FastActivateButton
            className={cn(
              "smoac-control explore-map__recenter",
              variant === "hero" && "explore-map__recenter--hero"
            )}
            onActivate={handleRecenter}
            aria-label="Recenter map to your 12-mile search area"
          >
            <FoldedMapIcon className="explore-map__recenter-icon" />
          </FastActivateButton>
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
