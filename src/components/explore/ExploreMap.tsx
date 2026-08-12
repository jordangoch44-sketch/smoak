"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Trainer } from "@/types";
import { LocationMarkIcon } from "@/components/ui/icons";
import { useProfileSheetOpen } from "@/hooks/useProfileSheetOpen";
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

/** Default camera: ~12-mile radius around the search origin */
export const DEFAULT_EXPLORE_MAP_RADIUS_MILES = 12;
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

/**
 * Explore map — pins current results around the search origin.
 * Fresh visits reset to a ~12-mile radius frame; user zoom is kept while
 * staying on Search (filters only refresh pins).
 */
export function ExploreMap({
  trainers,
  areaCenter = null,
  locked = true,
  variant = "panel",
  showNotes = true,
}: ExploreMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const areaDotRef = useRef<import("leaflet").CircleMarker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const framedOriginRef = useRef<string>("");
  const areaCenterRef = useRef(areaCenter);
  areaCenterRef.current = areaCenter;
  const [mapEpoch, setMapEpoch] = useState(0);
  const profileSheetOpen = useProfileSheetOpen();

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

  const areaKey = areaCenter
    ? `${areaCenter.latitude.toFixed(4)},${areaCenter.longitude.toFixed(4)}`
    : "";

  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | null = null;

    async function mountMap() {
      if (profileSheetOpen) return;

      const el = containerRef.current;
      if (!el) return;

      const L = (await import("leaflet")).default;
      if (cancelled || profileSheetOpen || !containerRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersLayerRef.current = null;
      areaDotRef.current = null;
      framedOriginRef.current = "";

      const center = areaCenterRef.current ?? FALLBACK_CENTER;
      leafletRef.current = L;

      map = L.map(el, {
        center: [center.latitude, center.longitude],
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

      frameRadiusMiles(map, L, center, DEFAULT_EXPLORE_MAP_RADIUS_MILES);
      framedOriginRef.current = areaCenterRef.current
        ? `${areaCenterRef.current.latitude.toFixed(4)},${areaCenterRef.current.longitude.toFixed(4)}`
        : "fallback";

      setMapEpoch((value) => value + 1);

      window.setTimeout(() => {
        map?.invalidateSize();
        if (map && leafletRef.current) {
          const liveCenter = areaCenterRef.current ?? FALLBACK_CENTER;
          frameRadiusMiles(
            map,
            leafletRef.current,
            liveCenter,
            DEFAULT_EXPLORE_MAP_RADIUS_MILES
          );
          framedOriginRef.current = areaCenterRef.current
            ? `${areaCenterRef.current.latitude.toFixed(4)},${areaCenterRef.current.longitude.toFixed(4)}`
            : "fallback";
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
  }, [locked, profileSheetOpen, variant]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || profileSheetOpen) return;

    const center = areaCenter ?? FALLBACK_CENTER;
    const key = areaKey || "fallback";
    if (framedOriginRef.current === key) return;

    frameRadiusMiles(map, L, center, DEFAULT_EXPLORE_MAP_RADIUS_MILES);
    framedOriginRef.current = key;
  }, [areaCenter, areaKey, profileSheetOpen, mapEpoch]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    const layer = markersLayerRef.current;
    if (!map || !L || !layer || profileSheetOpen) return;

    layer.clearLayers();
    if (areaDotRef.current) {
      areaDotRef.current.remove();
      areaDotRef.current = null;
    }

    if (areaCenter) {
      areaDotRef.current = L.circleMarker(
        [areaCenter.latitude, areaCenter.longitude],
        {
          radius: 9,
          className: "explore-map-area",
          color: "#ffffff",
          weight: 2.5,
          fillColor: "#9b5cff",
          fillOpacity: 1,
          interactive: false,
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
      marker.bindPopup(
        `<div class="explore-map-popup">
          <p class="explore-map-popup__name">${escapeHtml(pin.trainer.name)}</p>
          <p class="explore-map-popup__meta">${escapeHtml(profession)}</p>
          <p class="explore-map-popup__price">${escapeHtml(price)}</p>
          ${
            address
              ? `<p class="explore-map-popup__address">${escapeHtml(address)}</p>`
              : ""
          }
          <a class="explore-map-popup__link" href="${href}">View profile</a>
        </div>`,
        { maxWidth: 260 }
      );
      layer.addLayer(marker);
    }
  }, [mapped, areaCenter, profileSheetOpen, mapEpoch]);

  const handleRecenter = useCallback(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || profileSheetOpen) return;
    const center = areaCenterRef.current ?? FALLBACK_CENTER;
    frameRadiusMiles(map, L, center, DEFAULT_EXPLORE_MAP_RADIUS_MILES);
    const key = areaCenterRef.current
      ? `${areaCenterRef.current.latitude.toFixed(4)},${areaCenterRef.current.longitude.toFixed(4)}`
      : "fallback";
    framedOriginRef.current = key;
  }, [profileSheetOpen]);

  const missing = trainers.length - mapped.length;
  const showRecenter = !locked && !profileSheetOpen;
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
      {showRecenter ? (
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
