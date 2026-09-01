/**
 * Explore map basemap tiles (Leaflet fallback when Apple Maps token is unset).
 * Prefer CARTO Dark Matter when keyed; otherwise Esri World Street Map
 * darkened via CSS (OpenFreeMap/MapLibre proved unreliable in production).
 */

export type ExploreMapBasemap =
  | {
      kind: "raster";
      url: string;
      attribution: string;
      maxZoom: number;
      subdomains?: string;
      detectRetina?: boolean;
      tileModifierClass:
        | "explore-map-tiles--carto"
        | "explore-map-tiles--street-dark";
    };

const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const CARTO_ATTR = `${OSM_ATTR} &copy; <a href="https://carto.com/attributions">CARTO</a>`;

const ESRI_ATTR = `${OSM_ATTR} &copy; <a href="https://www.esri.com/">Esri</a>, USGS, NOAA`;

/** Public CARTO dark raster — requires `key` query param. */
function cartoDarkUrl(apiKey: string): string {
  const key = encodeURIComponent(apiKey);
  return `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${key}`;
}

/**
 * Esri World Street Map — detailed streets/labels, no API key for typical
 * basemap use. Tile path is `{z}/{y}/{x}`. Darkened via CSS.
 */
const ESRI_STREET_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";

export function getExploreMapBasemap(): ExploreMapBasemap {
  const cartoKey =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim()
      : undefined;

  if (cartoKey) {
    return {
      kind: "raster",
      url: cartoDarkUrl(cartoKey),
      attribution: CARTO_ATTR,
      maxZoom: 19,
      subdomains: "abcd",
      detectRetina: true,
      tileModifierClass: "explore-map-tiles--carto",
    };
  }

  return {
    kind: "raster",
    url: ESRI_STREET_URL,
    attribution: ESRI_ATTR,
    maxZoom: 19,
    detectRetina: true,
    tileModifierClass: "explore-map-tiles--street-dark",
  };
}

/** @deprecated Use getExploreMapBasemap */
export function getExploreMapTileConfig() {
  return getExploreMapBasemap();
}
