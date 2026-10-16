import type { AppleMapKit } from "@/lib/apple-maps";
import { metersToMiles } from "@/lib/driving-distance";
import type { UserGeoPoint } from "@/lib/trainer-proximity-sort";

const DIRECTION_LIBRARIES = ["services"] as const;

export type RoutePoint = {
  latitude: number;
  longitude: number;
};

export async function ensureAppleDirections(mapkit: AppleMapKit): Promise<void> {
  if (typeof mapkit.Directions === "function") return;
  const loaded = new Set(mapkit.loadedLibraries ?? []);
  const missing = DIRECTION_LIBRARIES.filter((name) => !loaded.has(name));
  if (missing.length === 0 || typeof mapkit.load !== "function") return;
  await mapkit.load(missing);
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
