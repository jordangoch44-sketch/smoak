"use client";

import { useEffect, useMemo, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Trainer } from "@/types";
import { useProfileSheetOpen } from "@/hooks/useProfileSheetOpen";
import { getTrainerCoordinates } from "@/lib/trainer-location";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import { formatProviderLocation } from "@/lib/provider-location";
import { formatTrainerPriceLabel } from "@/lib/home-discovery";

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

/**
 * Read-only map of current Explore results + search area.
 * Does not write specialist data — only plots existing lat/lng / ZIP / city coords.
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
  /* Soft-nav keeps Search mounted under the profile sheet — tear the map down
   * so Leaflet tiles/gestures don’t fight the sheet open on iOS. */
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

      const center = areaCenter ?? FALLBACK_CENTER;

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

      /* Dark basemap — Apple Maps–like greys / parks / water (CARTO Dark Matter) */
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

      if (areaCenter) {
        L.circleMarker([areaCenter.latitude, areaCenter.longitude], {
          radius: 8,
          className: "explore-map-area",
          color: "rgba(10, 132, 255, 0.95)",
          weight: 2,
          fillColor: "rgba(10, 132, 255, 0.32)",
          fillOpacity: 1,
          interactive: false,
        }).addTo(map);
      }

      const pinIcon = L.divIcon({
        className: "explore-map-pin",
        html: '<span class="explore-map-pin__dot" aria-hidden="true"></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        popupAnchor: [0, -10],
      });

      const bounds = L.latLngBounds([]);
      if (areaCenter) {
        bounds.extend([areaCenter.latitude, areaCenter.longitude]);
      }

      for (const pin of mapped) {
        const marker = L.marker([pin.latitude, pin.longitude], {
          icon: pinIcon,
          title: pin.trainer.name,
        }).addTo(map);

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
        bounds.extend([pin.latitude, pin.longitude]);
      }

      if (mapped.length === 0 && areaCenter) {
        map.setView([areaCenter.latitude, areaCenter.longitude], 11);
      } else if (mapped.length === 1 && !areaCenter) {
        map.setView([mapped[0].latitude, mapped[0].longitude], 12);
      } else if (bounds.isValid()) {
        map.fitBounds(bounds.pad(mapped.length <= 1 ? 0.35 : 0.22), {
          maxZoom: 13,
        });
      } else {
        map.setView([center.latitude, center.longitude], 11);
      }

      window.setTimeout(() => {
        map?.invalidateSize();
      }, 80);
      window.setTimeout(() => {
        map?.invalidateSize();
      }, 320);

      mapRef.current = map;
    }

    void mountMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      } else if (map) {
        map.remove();
      }
    };
  }, [mapped, areaKey, areaCenter, locked, profileSheetOpen]);

  const missing = trainers.length - mapped.length;
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
