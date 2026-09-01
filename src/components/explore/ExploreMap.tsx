"use client";

import { isAppleMapsConfigured } from "@/lib/apple-maps";
import {
  ExploreMapLeaflet,
  type ExploreMapArea,
  type ExploreMapProps,
} from "./ExploreMapLeaflet";
import { ExploreMapApple } from "./ExploreMapApple";

export type { ExploreMapArea, ExploreMapProps };
export { DEFAULT_EXPLORE_MAP_RADIUS_MILES } from "./ExploreMapLeaflet";
export {
  clusterTrainersForMap,
  type ExploreMapCluster,
} from "@/lib/explore-map-clusters";

/**
 * Explore map — Apple Maps (MapKit JS, dark) when
 * `NEXT_PUBLIC_APPLE_MAPS_TOKEN` is set; otherwise OpenFreeMap via Leaflet.
 * Supports Option B multi-trainer clustering and carousel callouts.
 */
export function ExploreMap(props: ExploreMapProps) {
  if (isAppleMapsConfigured()) {
    return <ExploreMapApple {...props} />;
  }
  return <ExploreMapLeaflet {...props} />;
}
