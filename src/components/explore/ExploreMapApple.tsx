"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  cameraShiftToClearPin,
  selectedPinClearBox,
  syncExploreMapPinSelection,
} from "@/lib/explore-map-pin-frame";
import {
  loadAppleMapKit,
  regionForRadiusMiles,
  type AppleMapKit,
} from "@/lib/apple-maps";
import {
  clusterTrainersForMap,
  clustersPinSignature,
  bindExploreMapPinSelect,
  buildExploreMapPinHtml,
  EXPLORE_MAP_CLUSTER_PIN_SIZE,
  EXPLORE_MAP_SINGLE_PIN_SIZE,
  PIN_TAP_SLOP_PX,
  type ExploreMapCluster,
} from "@/lib/explore-map-clusters";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { cn } from "@/lib/utils";
import { ExploreMapBottomCard } from "./ExploreMapBottomCard";
import { ExploreMapSearchRing } from "./ExploreMapSearchRing";
import type { ExploreMapArea, ExploreMapProps } from "./ExploreMapLeaflet";

type MapKitAnnotation = InstanceType<AppleMapKit["Annotation"]>;
type MapKitMap = InstanceType<AppleMapKit["Map"]>;

const FALLBACK_CENTER: ExploreMapArea = defaultMarketplaceCenter();

function pinNearPoint(
  root: ParentNode | null,
  x: number,
  y: number
): HTMLElement | null {
  if (!root) return null;
  let best: HTMLElement | null = null;
  let bestDistance = PIN_TAP_SLOP_PX;
  root.querySelectorAll(".explore-map-pin").forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const distance = Math.hypot(
      x - (rect.left + rect.width / 2),
      y - (rect.top + rect.height / 2)
    );
    if (distance < bestDistance) {
      best = node;
      bestDistance = distance;
    }
  });
  return best;
}

function clustersFrameKey(clusters: ExploreMapCluster[]): string {
  if (clusters.length === 0) return "clusters:empty";
  const first = clusters[0];
  const last = clusters[clusters.length - 1];
  return `clusters:${clusters.length}:${first.latitude.toFixed(3)},${first.longitude.toFixed(3)}:${last.latitude.toFixed(3)},${last.longitude.toFixed(3)}`;
}

const SELECTION_HOLD_MS = 1800;

/** Slide the map so the selected pin sits above the card, ring included. */
function revealApplePin(
  map: MapKitMap,
  mapkit: AppleMapKit,
  container: HTMLElement,
  cluster: ExploreMapCluster,
  pinEl: HTMLElement | null
): void {
  const box = selectedPinClearBox(container);
  let pinX: number | null = null;
  let pinY: number | null = null;

  if (pinEl) {
    const rect = pinEl.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      pinX = rect.left + rect.width / 2;
      pinY = rect.top + rect.height / 2;
    }
  }

  if (pinX === null || pinY === null) {
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
          pinX = pagePoint.x - window.scrollX;
          pinY = pagePoint.y - window.scrollY;
        }
      }
    } catch {
      /* leave the camera where it is */
    }
  }

  if (pinX === null || pinY === null) return;
  const shift = cameraShiftToClearPin(pinX, pinY, box);
  if (!shift) return;

  const region = map.region;
  const span = region?.span;
  const height = Math.max(container.clientHeight, 1);
  const width = Math.max(container.clientWidth, 1);
  if (!region?.center || !span) return;

  map.setCenterAnimated(
    new mapkit.Coordinate(
      region.center.latitude - shift.y * (span.latitudeDelta / height),
      region.center.longitude + shift.x * (span.longitudeDelta / width)
    ),
    false
  );
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
  if (suppressUntil) {
    const until = Date.now() + 280;
    if (until > suppressUntil.current) suppressUntil.current = until;
  }
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
  const framedOriginRef = useRef<string>("");
  const selectedCoordRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const selectedClusterIdRef = useRef<string | null>(null);
  const pinSelectGuardRef = useRef(0);
  const selectingRef = useRef(false);
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

  const holdSelection = useCallback(() => {
    const until = Date.now() + SELECTION_HOLD_MS;
    pinSelectGuardRef.current = until;
    suppressUntilRef.current = until;
  }, []);

  const revealSelectedPin = useCallback((cluster: ExploreMapCluster) => {
    if (selectedClusterIdRef.current !== cluster.id) return;
    const map = mapRef.current;
    const mapkit = mapkitRef.current;
    const container = containerRef.current;
    if (!map || !mapkit || !container) return;
    const pin = syncExploreMapPinSelection(stageRef.current, cluster.id);
    revealApplePin(map, mapkit, container, cluster, pin);
  }, []);

  const clearSelection = useCallback(() => {
    selectedCoordRef.current = null;
    selectedClusterIdRef.current = null;
    setSelectedCluster(null);
    const map = mapRef.current;
    if (map) map.selectedAnnotation = null;
    syncExploreMapPinSelection(stageRef.current, null);
  }, []);

  const selectCluster = useCallback(
    (cluster: ExploreMapCluster) => {
      if (selectingRef.current) return;
      selectingRef.current = true;
      try {
        const alreadySelected = selectedClusterIdRef.current === cluster.id;
        holdSelection();

        if (!alreadySelected) {
          selectedCoordRef.current = {
            latitude: cluster.latitude,
            longitude: cluster.longitude,
          };
          selectedClusterIdRef.current = cluster.id;
          setSelectedCluster(cluster);
          warmExploreMapCluster(cluster, routerRef.current);
        }

        const mapkit = mapkitRef.current;
        for (const annotation of pinAnnotationsRef.current) {
          const id = (annotation.data as { clusterId?: string } | undefined)
            ?.clusterId;
          const on = id === cluster.id;
          if (mapkit) {
            annotation.displayPriority = on
              ? mapkit.AnnotationDisplayPriority.Required
              : mapkit.AnnotationDisplayPriority.High;
          }
          if (annotation.selected !== on) annotation.selected = on;
        }

        revealSelectedPin(cluster);
      } finally {
        selectingRef.current = false;
      }
    },
    [holdSelection, revealSelectedPin]
  );

  useEffect(() => {
    if (!selectedCluster) return;
    holdSelection();
    revealSelectedPin(selectedCluster);
    const root = stageRef.current;
    const container = root?.querySelector(".mk-annotation-container") ?? root;
    const apply = () => {
      if (selectedClusterIdRef.current !== selectedCluster.id) return;
      syncExploreMapPinSelection(stageRef.current, selectedCluster.id);
    };
    const observer =
      container instanceof HTMLElement
        ? new MutationObserver(apply)
        : null;
    observer?.observe(container as HTMLElement, {
      childList: true,
      subtree: true,
    });
    const timer = window.setTimeout(() => {
      holdSelection();
      revealSelectedPin(selectedCluster);
    }, 240);
    return () => {
      observer?.disconnect();
      window.clearTimeout(timer);
    };
  }, [selectedCluster, revealSelectedPin, holdSelection, mapEpoch]);

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

      const pinEl =
        target.closest<HTMLElement>(".explore-map-pin") ??
        (event instanceof PointerEvent
          ? pinNearPoint(stageRef.current, event.clientX, event.clientY)
          : null);
      const clusterId =
        pinEl?.getAttribute("data-cluster-id") ??
        pinPressRef.current?.clusterId ??
        null;
      if (!clusterId) return;

      if (event instanceof PointerEvent) {
        const press = pinPressRef.current;
        if (
          press &&
          Math.hypot(event.clientX - press.x, event.clientY - press.y) >
            PIN_TAP_SLOP_PX
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
          ".explore-map-callout, .explore-bottom-card-dock, .explore-bottom-card, .explore-bottom-card__carousel, .explore-map-cluster-popup__carousel"
        )
      ) {
        return;
      }
      const pressedPin =
        target.closest<HTMLElement>(".explore-map-pin") ??
        pinNearPoint(stageRef.current, event.clientX, event.clientY);
      if (
        pressedPin ||
        target.closest(".explore-map-annotation-wrapper")
      ) {
        pinSelectGuardRef.current = Date.now() + SELECTION_HOLD_MS;
        const pinEl = pressedPin;
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
    const until = Date.now() + ms;
    if (until > suppressUntilRef.current) suppressUntilRef.current = until;
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
    const cameraHold = Date.now() + 1000;
    if (cameraHold > suppressUntilRef.current) {
      suppressUntilRef.current = cameraHold;
    }
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
          if (Date.now() < suppressUntilRef.current) return;
          if (Date.now() < pinSelectGuardRef.current) return;
          clearSelection();
          onMapSearchStartRef.current?.();
        };
        const onRegionChangeEnd = () => {
          if (!mapRef.current) return;
          syncExploreMapPinSelection(
            stageRef.current,
            selectedClusterIdRef.current
          );
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

      const annotation = new mapkit.Annotation(
        new mapkit.Coordinate(cluster.latitude, cluster.longitude),
        () => {
          const selected = selectedClusterIdRef.current === cluster.id;
          const el = document.createElement("div");
          el.className = `explore-map-annotation-wrapper ${isMulti ? "explore-map-annotation-wrapper--cluster" : "explore-map-annotation-wrapper--single"}${selected ? " explore-map-pin-frame--selected" : ""}`;
          el.innerHTML = buildExploreMapPinHtml(cluster, selected);

          bindExploreMapPinSelect(
            el,
            () => selectCluster(cluster),
            () => {
              pinSelectGuardRef.current = Date.now() + SELECTION_HOLD_MS;
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
          collisionMode: mapkit.AnnotationCollisionMode.None,
          displayPriority:
            selectedClusterIdRef.current === cluster.id
              ? mapkit.AnnotationDisplayPriority.Required
              : mapkit.AnnotationDisplayPriority.High,
        }
      );

      annotation.addEventListener("select", () => {
        selectCluster(cluster);
      });

      nextPins.push(annotation);
    }

    if (nextPins.length > 0) {
      map.addAnnotations(nextPins);
    }
    pinAnnotationsRef.current = nextPins;
    syncExploreMapPinSelection(stageRef.current, selectedClusterIdRef.current);

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
