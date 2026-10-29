import { haversineMiles } from "@/lib/geo/haversine";
import type {
  ExploreMapCardSlide,
  ExploreMapCluster,
} from "@/lib/explore-map-clusters";

/** Geographic rectangle currently drawn in the map view. */
export interface ExploreMapViewport {
  north: number;
  south: number;
  east: number;
  west: number;
  centerLatitude: number;
  centerLongitude: number;
}

function longitudeInside(longitude: number, west: number, east: number): boolean {
  if (west <= east) return longitude >= west && longitude <= east;
  return longitude >= west || longitude <= east;
}

export function coordinateInMapViewport(
  latitude: number,
  longitude: number,
  viewport: ExploreMapViewport
): boolean {
  if (latitude > viewport.north || latitude < viewport.south) return false;
  return longitudeInside(longitude, viewport.west, viewport.east);
}

/**
 * Specialists whose pins sit inside the viewport, nearest the visible center first.
 * Specialists that share a pin keep their existing order.
 */
export function visibleSpecialistSlides(
  clusters: readonly ExploreMapCluster[],
  viewport: ExploreMapViewport
): ExploreMapCardSlide[] {
  const visible = clusters.filter((cluster) =>
    coordinateInMapViewport(cluster.latitude, cluster.longitude, viewport)
  );
  visible.sort((a, b) => {
    const delta =
      haversineMiles(
        viewport.centerLatitude,
        viewport.centerLongitude,
        a.latitude,
        a.longitude
      ) -
      haversineMiles(
        viewport.centerLatitude,
        viewport.centerLongitude,
        b.latitude,
        b.longitude
      );
    if (Math.abs(delta) > 1e-6) return delta;
    if (a.id === b.id) return 0;
    return a.id < b.id ? -1 : 1;
  });

  const slides: ExploreMapCardSlide[] = [];
  for (const cluster of visible) {
    for (const trainer of cluster.trainers) {
      slides.push({ trainer, clusterId: cluster.id });
    }
  }
  return slides;
}

export function findExploreMapSlide(
  clusters: readonly ExploreMapCluster[],
  trainerId: string | null | undefined
): ExploreMapCardSlide | null {
  if (!trainerId) return null;
  for (const cluster of clusters) {
    const trainer = cluster.trainers.find((item) => item.id === trainerId);
    if (trainer) return { trainer, clusterId: cluster.id };
  }
  return null;
}

export function slidesRosterKey(slides: readonly ExploreMapCardSlide[]): string {
  return slides.map((slide) => slide.trainer.id).join("\0");
}

/**
 * Page index after a horizontal drag on the fixed card info.
 * `velocity` is px/ms from the end of the gesture; negative means the finger
 * moved left (toward the next card). A short flick projects forward so the
 * card always finishes on a neighbor instead of resting between cards.
 */
export function nextSpecialistIndex({
  startIndex,
  count,
  dx,
  velocity,
  width,
  minIndex,
}: {
  startIndex: number;
  count: number;
  dx: number;
  velocity: number;
  width: number;
  minIndex: number;
}): number {
  if (count <= 1) return 0;
  const maxIndex = count - 1;
  const floor = Math.max(0, Math.min(minIndex, maxIndex));
  const projected = dx + velocity * 180;
  const threshold = Math.min(42, Math.max(width, 1) * 0.1);
  let next = startIndex;
  if (projected <= -threshold) next = startIndex + 1;
  else if (projected >= threshold) next = startIndex - 1;
  if (next < floor) return floor;
  if (next > maxIndex) return maxIndex;
  return next;
}
