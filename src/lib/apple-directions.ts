import type { AppleMapKit } from "@/lib/apple-maps";
import { haversineMiles } from "@/lib/geo/haversine";
import { metersToMiles } from "@/lib/driving-distance";
import type { UserGeoPoint } from "@/lib/trainer-proximity-sort";

const DIRECTION_LIBRARIES = ["services", "overlays"] as const;

export type RoutePoint = {
  latitude: number;
  longitude: number;
};

export type DrivingRouteGeometry = {
  miles: number;
  points: RoutePoint[];
};

export async function ensureAppleDirections(mapkit: AppleMapKit): Promise<void> {
  if (
    typeof mapkit.Directions === "function" &&
    typeof mapkit.PolylineOverlay === "function"
  ) {
    return;
  }
  const loaded = new Set(mapkit.loadedLibraries ?? []);
  const missing = DIRECTION_LIBRARIES.filter((name) => !loaded.has(name));
  if (missing.length === 0 || typeof mapkit.load !== "function") return;
  await mapkit.load(missing);
}

export async function fetchDrivingRoute(
  mapkit: AppleMapKit,
  origin: UserGeoPoint,
  destination: RoutePoint,
  signal?: AbortSignal
): Promise<DrivingRouteGeometry | null> {
  await ensureAppleDirections(mapkit);
  const directions = new mapkit.Directions();
  const response = await directions.route({
    origin: new mapkit.Coordinate(origin.latitude, origin.longitude),
    destination: new mapkit.Coordinate(
      destination.latitude,
      destination.longitude
    ),
    transportType: mapkit.TransportType.Automobile,
    requestsAlternateRoutes: false,
    signal,
  });
  const route = response.routes[0];
  if (!route || !Number.isFinite(route.distance)) return null;
  const points = route.polyline.points.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
  }));
  if (points.length < 2) return null;
  return { miles: metersToMiles(route.distance), points };
}

export async function fetchDrivingEtas(
  mapkit: AppleMapKit,
  origin: UserGeoPoint,
  destinations: readonly RoutePoint[],
  signal?: AbortSignal
): Promise<Array<number | null>> {
  if (destinations.length === 0) return [];
  await ensureAppleDirections(mapkit);
  const directions = new mapkit.Directions();
  const response = await directions.eta({
    origin: new mapkit.Coordinate(origin.latitude, origin.longitude),
    destinations: destinations.map(
      (destination) =>
        new mapkit.Coordinate(destination.latitude, destination.longitude)
    ),
    transportType: mapkit.TransportType.Automobile,
    signal,
  });
  return destinations.map((destination, index) => {
    const eta =
      response.etas.find((candidate) =>
        samePoint(candidate.destination, destination)
      ) ?? response.etas[index];
    if (!eta || !Number.isFinite(eta.distance)) return null;
    return metersToMiles(eta.distance);
  });
}

/** Point halfway along the driven path, so the miles pill sits on the line. */
export function midpointAlongPath(points: readonly RoutePoint[]): RoutePoint {
  if (points.length === 0) {
    return { latitude: 0, longitude: 0 };
  }
  if (points.length === 1) return points[0];

  const segments: number[] = [];
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const length = haversineMiles(
      previous.latitude,
      previous.longitude,
      current.latitude,
      current.longitude
    );
    segments.push(length);
    total += length;
  }

  let remaining = total / 2;
  for (let index = 1; index < points.length; index += 1) {
    const length = segments[index - 1] ?? 0;
    const previous = points[index - 1];
    const current = points[index];
    if (remaining <= length || index === points.length - 1) {
      const ratio = length === 0 ? 0 : Math.min(1, remaining / length);
      return {
        latitude:
          previous.latitude + (current.latitude - previous.latitude) * ratio,
        longitude:
          previous.longitude +
          (current.longitude - previous.longitude) * ratio,
      };
    }
    remaining -= length;
  }

  return points[Math.floor(points.length / 2)] ?? points[0];
}

function samePoint(
  candidate: { latitude: number; longitude: number } | undefined,
  destination: RoutePoint
): boolean {
  if (!candidate) return false;
  return (
    Math.abs(candidate.latitude - destination.latitude) < 0.0002 &&
    Math.abs(candidate.longitude - destination.longitude) < 0.0002
  );
}
