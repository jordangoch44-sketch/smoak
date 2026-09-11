"use client";

import { useEffect, useRef, useState } from "react";
import {
  isAppleMapsConfigured,
  loadAppleMapKit,
  regionForRadiusMiles,
  type AppleMapKit,
} from "@/lib/apple-maps";
import type { LocationTravelMap } from "@/lib/specialist-service-area";

interface ProfileDetailsRadiusMapProps {
  map: LocationTravelMap;
}

type MapKitMap = InstanceType<AppleMapKit["Map"]>;

const METERS_PER_MILE = 1609.344;
const DEFAULT_ACCENT = "#a855f7";

function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y };
}

function esriTileUrl(z: number, x: number, y: number): string {
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`;
}

function zoomForMiles(miles: number | null): number {
  if (!miles || miles >= 40) return 10;
  if (miles >= 20) return 11;
  if (miles >= 10) return 12;
  return 13;
}

function radiusBadge(miles: number | null): string | null {
  if (miles == null || miles <= 0) return null;
  return `${miles >= 50 ? "50+" : miles} mi radius`;
}

function frameMilesForPreview(miles: number | null): number {
  if (miles != null && miles > 0) return Math.max(miles, 2);
  return 4;
}

function accentHexFrom(el: HTMLElement): string {
  const raw = getComputedStyle(el).getPropertyValue("--profile-accent-rgb").trim();
  const parts = raw.split(",").map((part) => Number.parseInt(part.trim(), 10));
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return DEFAULT_ACCENT;
  return `#${parts
    .slice(0, 3)
    .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0"))
    .join("")}`;
}

function ProfileDetailsEsriRadiusMap({ map }: ProfileDetailsRadiusMapProps) {
  const zoom = zoomForMiles(map.miles);
  const { x, y } = latLngToTile(map.latitude, map.longitude, zoom);
  const src = esriTileUrl(zoom, x, y);
  const badge = radiusBadge(map.miles);

  return (
    <div className="profile-details-map" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="profile-details-map__tile" />
      {badge ? <span className="profile-details-map__radius" /> : null}
      <span className="profile-details-map__pin" />
      {badge ? <span className="profile-details-map__badge">{badge}</span> : null}
      <span className="profile-details-map__credit">Map © Esri</span>
    </div>
  );
}

function ProfileDetailsAppleRadiusMap({ map }: ProfileDetailsRadiusMapProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [showCssRadius, setShowCssRadius] = useState(
    () => map.miles != null && map.miles > 0
  );
  const badge = radiusBadge(map.miles);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    setFailed(false);
    setShowCssRadius(map.miles != null && map.miles > 0);

    let cancelled = false;
    let appleMap: MapKitMap | null = null;
    let resizeTimer = 0;

    async function mount() {
      try {
        const mapkit = await loadAppleMapKit();
        if (cancelled || !el) return;

        const color = accentHexFrom(el);
        const frameMiles = frameMilesForPreview(map.miles);
        const center = new mapkit.Coordinate(map.latitude, map.longitude);
        const region = regionForRadiusMiles(mapkit, map, frameMiles);

        appleMap = new mapkit.Map(el, {
          center,
          region,
          colorScheme: mapkit.ColorScheme.Dark,
          isScrollEnabled: false,
          isZoomEnabled: false,
          isRotationEnabled: false,
          showsZoomControl: false,
          showsMapTypeControl: false,
          showsUserLocationControl: false,
          showsCompass: mapkit.FeatureVisibility.Hidden,
          showsScale: mapkit.FeatureVisibility.Hidden,
          showsPointsOfInterest: false,
        });

        if (map.miles != null && map.miles > 0) {
          const overlay = new mapkit.CircleOverlay(
            center,
            map.miles * METERS_PER_MILE,
            {
              enabled: false,
              style: new mapkit.Style({
                lineWidth: 2,
                strokeColor: color,
                strokeOpacity: 0.7,
                fillColor: color,
                fillOpacity: 0.2,
              }),
            }
          );
          appleMap.addOverlay(overlay);
          if (!cancelled) setShowCssRadius(false);
        }

        resizeTimer = window.setTimeout(() => {
          if (cancelled || !appleMap) return;
          appleMap.region = regionForRadiusMiles(mapkit, map, frameMiles);
        }, 280);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    void mount();

    return () => {
      cancelled = true;
      window.clearTimeout(resizeTimer);
      appleMap?.destroy();
      appleMap = null;
    };
  }, [map.latitude, map.longitude, map.miles]);

  if (failed) return <ProfileDetailsEsriRadiusMap map={map} />;

  return (
    <div className="profile-details-map profile-details-map--apple" aria-hidden>
      <div ref={stageRef} className="profile-details-map__apple" />
      {showCssRadius ? <span className="profile-details-map__radius" /> : null}
      <span className="profile-details-map__pin" />
      {badge ? <span className="profile-details-map__badge">{badge}</span> : null}
    </div>
  );
}

export function ProfileDetailsRadiusMap({ map }: ProfileDetailsRadiusMapProps) {
  if (!isAppleMapsConfigured()) {
    return <ProfileDetailsEsriRadiusMap map={map} />;
  }
  return <ProfileDetailsAppleRadiusMap map={map} />;
}
