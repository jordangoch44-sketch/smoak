"use client";

import type { LocationTravelMap } from "@/lib/specialist-service-area";

interface ProfileDetailsRadiusMapProps {
  map: LocationTravelMap;
}

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

export function ProfileDetailsRadiusMap({ map }: ProfileDetailsRadiusMapProps) {
  const zoom = zoomForMiles(map.miles);
  const { x, y } = latLngToTile(map.latitude, map.longitude, zoom);
  const src = esriTileUrl(zoom, x, y);
  const badge =
    map.miles != null && map.miles > 0
      ? `${map.miles >= 50 ? "50+" : map.miles} mi radius`
      : null;

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
