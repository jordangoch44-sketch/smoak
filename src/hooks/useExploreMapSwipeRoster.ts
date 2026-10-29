"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExploreMapCardSlide, ExploreMapCluster } from "@/lib/explore-map-clusters";
import {
  slidesRosterKey,
  visibleSpecialistSlides,
  type ExploreMapViewport,
} from "@/lib/explore-map-visible";

/**
 * Specialists eligible for card swiping.
 * The list refreshes after the user finishes panning or zooming, and when
 * search results change — not when the selected card changes.
 */
export function useExploreMapSwipeRoster({
  clusters,
  readViewport,
  suppressUntilRef,
}: {
  clusters: readonly ExploreMapCluster[];
  readViewport: () => ExploreMapViewport | null;
  suppressUntilRef: { current: number };
}) {
  const clustersRef = useRef(clusters);
  clustersRef.current = clusters;
  const readViewportRef = useRef(readViewport);
  readViewportRef.current = readViewport;
  const [slides, setSlides] = useState<ExploreMapCardSlide[]>([]);
  const keyRef = useRef("");
  const dirtyRef = useRef(true);
  const timerRef = useRef(0);

  const snapshot = useCallback((): boolean => {
    const viewport = readViewportRef.current();
    if (!viewport) return false;
    dirtyRef.current = false;
    const next = visibleSpecialistSlides(clustersRef.current, viewport);
    const key = slidesRosterKey(next);
    if (key !== keyRef.current) {
      keyRef.current = key;
      setSlides(next);
      return true;
    }
    setSlides((current) => {
      if (
        current.length === next.length &&
        current.every(
          (slide, index) =>
            slide.trainer === next[index]?.trainer &&
            slide.clusterId === next[index]?.clusterId
        )
      ) {
        return current;
      }
      return next;
    });
    return true;
  }, []);

  const noteUserMoveEnd = useCallback(() => {
    snapshot();
  }, [snapshot]);

  const noteProgrammaticMoveEnd = useCallback(() => {
    // Camera framing and search refreshes settle here. Selection does not
    // move the camera, so it does not reach this path.
    snapshot();
  }, [snapshot]);

  const clustersKey =
    clusters.length === 0
      ? "empty"
      : clusters
          .map(
            (cluster) =>
              `${cluster.id}:${cluster.trainers.map((trainer) => trainer.id).join(",")}`
          )
          .join("|");

  useEffect(() => {
    dirtyRef.current = true;
    let cancelled = false;
    let attempts = 0;
    const tick = () => {
      if (cancelled) return;
      if (Date.now() < suppressUntilRef.current || !snapshot()) {
        attempts += 1;
        if (attempts > 80) return;
        timerRef.current = window.setTimeout(tick, 80);
      }
    };
    timerRef.current = window.setTimeout(tick, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timerRef.current);
    };
  }, [clustersKey, snapshot, suppressUntilRef]);

  return { slides, noteUserMoveEnd, noteProgrammaticMoveEnd };
}
