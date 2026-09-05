/** Fired after Search layout is stable (tab slide, location gate, first paint). */

export const EXPLORE_MAP_LAYOUT_EVENT = "smoac:explore-map-layout";

/** Ask map engines to recapture container size and rebind pin hits. */
export function notifyExploreMapLayout(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EXPLORE_MAP_LAYOUT_EVENT));
}
