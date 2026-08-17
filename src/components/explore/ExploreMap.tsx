"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Trainer } from "@/types";
import { LocationMarkIcon } from "@/components/ui/icons";
import {
  useProfileSheetOpen,
  useSiteLocationGateOpen,
} from "@/hooks/useProfileSheetOpen";
import { DEFAULT_EXPLORE_RADIUS_MILES } from "@/lib/explore";
import {
  exploreSearchAreasDiffer,
  searchAreaFromMapViewport,
  type ExploreSearchArea,
} from "@/lib/explore-map-area";
import { getTrainerCoordinates } from "@/lib/trainer-location";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import { formatProviderLocation } from "@/lib/provider-location";
import { formatTrainerPriceLabel } from "@/lib/home-discovery";
import { cn } from "@/lib/utils";

export type ExploreMapArea = {
  latitude: number;
  longitude: number;
};

interface ExploreMapProps {
  trainers: Trainer[];
  /** Search / personalization area — frames the map even when pins are sparse */
  areaCenter?: ExploreMapArea | null;
  /**
   * Precise device GPS only. Never ZIP/city centroids, never Search-here center.
   * Null → no purple “you are here” dot.
   */
  userLocationDot?: ExploreMapArea | null;
  /** Active area used for pins + list (default 12 mi around origin) */
  activeSearchArea?: ExploreSearchArea | null;
  /** User moved the map — pending area ready for Search here */
  onPendingSearchAreaChange?: (area: ExploreSearchArea | null) => void;
  /** Recenter camera + reset results to default 12-mile frame */
  onRecenterSearch?: () => void;
  /** Display-only: no drag / zoom (default true) */
  locked?: boolean;
  /** `split` = compact height; `panel` = full map view; `hero` = full-bleed under header */
  variant?: "panel" | "split" | "hero";
  showNotes?: boolean;
}

type MappedTrainer = {
  trainer: Trainer;
  latitude: number;
  longitude: number;
};

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

function pinsFrameKey(pins: MappedTrainer[]): string {
  if (pins.length === 0) return "pins:empty";
  const first = pins[0];
  const last = pins[pins.length - 1];
  return `pins:${pins.length}:${first.latitude.toFixed(3)},${first.longitude.toFixed(3)}:${last.latitude.toFixed(3)},${last.longitude.toFixed(3)}`;
}

function fitMappedPins(
  map: import("leaflet").Map,
  L: typeof import("leaflet"),
  pins: MappedTrainer[]
) {
  if (pins.length === 0) return;
  if (pins.length === 1) {
    map.setView([pins[0].latitude, pins[0].longitude], 12, { animate: false });
    return;
  }
  try {
    const bounds = L.latLngBounds(
      pins.map((pin) => [pin.latitude, pin.longitude] as [number, number])
    );
    map.fitBounds(bounds, {
      animate: false,
      padding: [36, 36],
      maxZoom: 13,
    });
  } catch {
    map.setView([pins[0].latitude, pins[0].longitude], 11, { animate: false });
  }
}

/**
 * Explore map — pins current results around the search origin.
 * Fresh visits / recenter use the default radius frame; pan/zoom or radius
 * presets surface “Search here” before updating results.
 */
export function ExploreMap({
  trainers,
  areaCenter = null,
  userLocationDot = null,
  activeSearchArea = null,
  onPendingSearchAreaChange,
  onRecenterSearch,
  locked = true,
  variant = "panel",
  showNotes = true,
}: ExploreMapProps) {
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
  const profileSheetOpen = useProfileSheetOpen();
  const locationGateOpen = useSiteLocationGateOpen();
  const mapPaused = profileSheetOpen || locationGateOpen;

  const mapped = useMemo(() => {
    const pins: MappedTrainer[] = [];
    for (const trainer of trainers) {
      const coords = getTrainerCoordinates(trainer);
      if (!coords) continue;
      pins.push({
        trainer,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    }
    return pins;
  }, [trainers]);
  const mappedRef = useRef(mapped);
  mappedRef.current = mapped;

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
      const pins = mappedRef.current;
      if (origin) {
        const radius =
          activeSearchAreaRef.current?.radiusMiles ??
          DEFAULT_EXPLORE_RADIUS_MILES;
        frameRadiusMiles(map, L, origin, radius);
        framedOriginRef.current = `${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)}`;
      } else if (pins.length > 0) {
        fitMappedPins(map, L, pins);
        framedOriginRef.current = pinsFrameKey(pins);
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

    async function mountMap() {
      if (mapPaused) return;

      const el = containerRef.current;
      if (!el) return;

      const L = (await import("leaflet")).default;
      if (cancelled || mapPaused || !containerRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersLayerRef.current = null;
      areaDotRef.current = null;
      framedOriginRef.current = "";

      const origin = areaCenterRef.current;
      const pins = mappedRef.current;
      const start =
        origin ??
        (pins[0]
          ? { latitude: pins[0].latitude, longitude: pins[0].longitude }
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

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 18,
          subdomains: "abcd",
          className: "explore-map-tiles",
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }
      ).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      suppressUntilRef.current = Date.now() + 400;
      applyLiveCamera(map, L);

      setMapEpoch((value) => value + 1);

      const onMoveEnd = () => {
        emitPendingFromMap(map!);
      };

      map.on("moveend", onMoveEnd);

      window.setTimeout(() => {
        map?.invalidateSize();
        if (map && leafletRef.current) {
          suppressUntilRef.current = Date.now() + 320;
          applyLiveCamera(map, leafletRef.current);
        }
      }, 80);
      window.setTimeout(() => {
        map?.invalidateSize();
      }, 320);
    }

    void mountMap();

    return () => {
      cancelled = true;
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
  }, [applyLiveCamera, emitPendingFromMap, locked, mapPaused, variant]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || mapPaused) return;

    const key = areaCenter
      ? areaKey
      : pinsFrameKey(mapped);
    if (framedOriginRef.current === key) return;

    suppressMoves(280);
    applyLiveCamera(map, L);
  }, [
    areaCenter,
    areaKey,
    mapped,
    activeSearchArea?.radiusMiles,
    mapPaused,
    mapEpoch,
    applyLiveCamera,
    suppressMoves,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    const layer = markersLayerRef.current;
    if (!map || !L || !layer || mapPaused) return;

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

    const pinIcon = L.divIcon({
      className: "explore-map-pin",
      html: '<span class="explore-map-pin__dot" aria-hidden="true"></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      popupAnchor: [0, -10],
    });

    for (const pin of mapped) {
      const marker = L.marker([pin.latitude, pin.longitude], {
        icon: pinIcon,
        title: pin.trainer.name,
      });

      const profession =
        resolveTrainerProfessionCategory(pin.trainer) ||
        pin.trainer.profession ||
        "Specialist";
      const price = formatTrainerPriceLabel(pin.trainer.pricePerSession);
      const address =
        formatProviderLocation(pin.trainer) ||
        pin.trainer.location?.trim() ||
        "";
      const href = `/trainers/${encodeURIComponent(pin.trainer.id)}`;
      const photoSrc = safeImageSrc(pin.trainer.image);
      const photoHtml = photoSrc
        ? `<img class="explore-map-popup__photo" src="${escapeHtml(photoSrc)}" alt="" width="64" height="64" loading="lazy" decoding="async" />`
        : `<span class="explore-map-popup__photo explore-map-popup__photo--empty" aria-hidden="true"></span>`;
      const priceIcon =
        `<svg class="explore-map-popup__icon" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.6 12.6 12.7 4.7A2 2 0 0 0 11.3 4H5a1 1 0 0 0-1 1v6.3a2 2 0 0 0 .6 1.4l7.9 7.9a2 2 0 0 0 2.8 0l5.3-5.3a2 2 0 0 0 0-2.8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="8.2" cy="8.2" r="1.2" fill="currentColor"/></svg>`;
      const pinIconSvg =
        `<svg class="explore-map-popup__icon" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.25" stroke="currentColor" stroke-width="1.8"/></svg>`;
      const chevronIcon =
        `<svg class="explore-map-popup__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      marker.bindPopup(
        `<div class="explore-map-popup">
          <div class="explore-map-popup__main">
            ${photoHtml}
            <div class="explore-map-popup__copy">
              <p class="explore-map-popup__name">${escapeHtml(pin.trainer.name)}</p>
              <p class="explore-map-popup__meta">${escapeHtml(profession)}</p>
            </div>
          </div>
          <div class="explore-map-popup__details">
            <p class="explore-map-popup__detail">${priceIcon}<span>${escapeHtml(price)}</span></p>
            ${
              address
                ? `<p class="explore-map-popup__detail">${pinIconSvg}<span>${escapeHtml(address)}</span></p>`
                : ""
            }
          </div>
          <a class="explore-map-popup__link" href="${href}"><span>View profile</span>${chevronIcon}</a>
        </div>`,
        { maxWidth: 260, minWidth: 210, className: "explore-map-popup-wrap" }
      );
      layer.addLayer(marker);
    }
  }, [mapped, userLocationDot, mapPaused, mapEpoch]);

  const handleRecenter = useCallback(() => {
    if (mapPaused) return;
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;
    suppressMoves(280);
    applyLiveCamera(map, L);
    onRecenterSearch?.();
  }, [onRecenterSearch, mapPaused, applyLiveCamera, suppressMoves]);

  const missing = trainers.length - mapped.length;
  const showChrome = !locked && !mapPaused;
  const rootClass = [
    "explore-map",
    variant === "hero"
      ? "explore-map--hero"
      : variant === "split"
        ? "explore-map--split"
        : "explore-map--panel",
    locked ? "explore-map--locked" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      <div
        ref={containerRef}
        className="explore-map__canvas"
        role="img"
        aria-label="Map of specialists in this search area"
      />
      {showChrome ? (
        <button
          type="button"
          className={cn(
            "smoac-control explore-map__recenter",
            variant === "hero" && "explore-map__recenter--hero"
          )}
          onClick={handleRecenter}
          aria-label="Recenter map to your 12-mile search area"
        >
          <LocationMarkIcon className="explore-map__recenter-icon" />
          <span className="explore-map__recenter-label">Recenter</span>
        </button>
      ) : null}
      {showNotes ? (
        mapped.length === 0 ? (
          <p className="explore-map__empty">
            {areaCenter
              ? "Showing your search area. Specialist pins appear when a city or ZIP can be resolved — profiles are unchanged."
              : "No mappable locations in these results yet. Specialists appear here once a city or ZIP can be resolved — profiles are unchanged."}
          </p>
        ) : missing > 0 ? (
          <p className="explore-map__note">
            Showing {mapped.length} of {trainers.length} on the map
            {missing === 1
              ? " · 1 without a resolvable location"
              : ` · ${missing} without a resolvable location`}
            .
          </p>
        ) : (
          <p className="explore-map__note">
            {mapped.length} specialist{mapped.length === 1 ? "" : "s"} in this
            area.
          </p>
        )
      ) : null}
    </div>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeImageSrc(url: string | undefined | null): string | null {
  const value = url?.trim() ?? "";
  if (!value) return null;
  if (/^(javascript|data|vbscript):/i.test(value)) return null;
  if (/^(https?:\/\/|\/)/i.test(value)) return value;
  return null;
}
