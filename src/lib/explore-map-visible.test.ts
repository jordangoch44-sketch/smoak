import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ExploreMapCluster } from "@/lib/explore-map-clusters";
import type { Trainer } from "@/types";
import {
  nextSpecialistIndex,
  visibleSpecialistSlides,
  type ExploreMapViewport,
} from "@/lib/explore-map-visible";

const VIEW: ExploreMapViewport = {
  north: 32.8,
  south: 32.7,
  east: -117.05,
  west: -117.25,
  centerLatitude: 32.75,
  centerLongitude: -117.15,
};

function cluster(
  id: string,
  latitude: number,
  longitude: number,
  trainerIds: string[]
): ExploreMapCluster {
  const trainers = trainerIds.map(
    (trainerId) => ({ id: trainerId, name: trainerId }) as Trainer
  );
  return {
    id,
    latitude,
    longitude,
    trainers,
    primaryTrainer: trainers[0]!,
    count: trainers.length,
    isMulti: trainers.length > 1,
    locationLabel: "Test",
  };
}

describe("visible map specialists", () => {
  it("keeps only pins inside the viewport and sorts them from the center", () => {
    const slides = visibleSpecialistSlides(
      [
        cluster("outside", 33.2, -117.15, ["outside"]),
        cluster("mid", 32.77, -117.15, ["mid"]),
        cluster("center", 32.75, -117.15, ["near-a", "near-b"]),
        cluster("edge", 32.8, -117.15, ["edge"]),
      ],
      VIEW
    );
    assert.deepEqual(
      slides.map((slide) => slide.trainer.id),
      ["near-a", "near-b", "mid", "edge"]
    );
  });

  it("stops at the ends instead of wrapping", () => {
    assert.equal(
      nextSpecialistIndex({
        startIndex: 4,
        count: 5,
        dx: -200,
        velocity: -1,
        width: 300,
        minIndex: 0,
      }),
      4
    );
    assert.equal(
      nextSpecialistIndex({
        startIndex: 0,
        count: 5,
        dx: 200,
        velocity: 1,
        width: 300,
        minIndex: 0,
      }),
      0
    );
  });

  it("commits a short flick and springs a tiny drag back", () => {
    assert.equal(
      nextSpecialistIndex({
        startIndex: 1,
        count: 5,
        dx: -22,
        velocity: -0.4,
        width: 300,
        minIndex: 0,
      }),
      2
    );
    assert.equal(
      nextSpecialistIndex({
        startIndex: 1,
        count: 5,
        dx: -12,
        velocity: -0.02,
        width: 300,
        minIndex: 0,
      }),
      1
    );
  });

  it("does not return to a specialist who has left the viewport", () => {
    assert.equal(
      nextSpecialistIndex({
        startIndex: 2,
        count: 5,
        dx: 220,
        velocity: 0.8,
        width: 300,
        minIndex: 1,
      }),
      1
    );
  });
});
