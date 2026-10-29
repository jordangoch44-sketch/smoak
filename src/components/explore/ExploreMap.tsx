"use client";

import { isAppleMapsConfigured, loadAppleMapKit } from "@/lib/apple-maps";
import {
  ExploreMapLeaflet,
  type ExploreMapArea,
  type ExploreMapProps,
} from "./ExploreMapLeaflet";
import { ExploreMapApple } from "./ExploreMapApple";

export type { ExploreMapArea, ExploreMapProps };
export {
  clusterTrainersForMap,
  type ExploreMapCluster,
} from "@/lib/explore-map-clusters";

/** Start MapKit while the Search page hydrates, so pins are not waiting on the script. */
if (typeof window !== "undefined" && isAppleMapsConfigured()) {
  void loadAppleMapKit();
}

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
