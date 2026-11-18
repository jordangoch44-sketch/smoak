import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_TRAINER_FILTERS,
  filterExploreTrainersInArea,
} from "@/lib/explore";
import type { Trainer } from "@/types";

function trainer(partial: Partial<Trainer> & Pick<Trainer, "id" | "name">): Trainer {
  return {
    profession: "Personal Training",
    title: "Coach",
    location: "San Diego",
    city: "San Diego",
    neighborhood: "Mira Mesa",
    serviceArea: [],
    zipCode: "92126",
    latitude: 32.92,
    longitude: -117.14,
    specialty: ["Strength"],
    gender: "",
    pricePerSession: 120,
    rating: 0,
    reviewCount: 0,
    galleryImages: [],
    image: "",
    heroImage: "",
    bio: "",
    bestFor: [],
    coachingStyle: [],
    whyClientsChoose: [],
    sessionExperience: [],
    gallery: [],
    clientTransformations: [],
    featured: false,
    certifications: [],
    reviews: [],
    social: {},
    ...partial,
  };
}

const sanDiego = { latitude: 32.92, longitude: -117.14 };
const noRadius = { radiusMiles: null as number | null };

describe("marketplace name search", () => {
  const otg = trainer({
    id: "otg",
    name: "OTG Strength",
    specialistPersonName: "Jordan Gochenour",
    specialistFirstName: "Jordan",
  });
  const other = trainer({
    id: "other",
    name: "North Studio",
    specialistPersonName: "Elena Vasquez",
    latitude: 34.05,
    longitude: -118.25,
  });

  it("matches a personal name that is not the business name", () => {
    const result = filterExploreTrainersInArea(
      [otg, other],
      EMPTY_TRAINER_FILTERS,
      "gochenour",
      sanDiego,
      noRadius
    );
    assert.deepEqual(
      result.trainers.map((row) => row.id),
      ["otg"]
    );
  });

  it("matches the business listing name", () => {
    const result = filterExploreTrainersInArea(
      [otg, other],
      EMPTY_TRAINER_FILTERS,
      "otg",
      sanDiego,
      noRadius
    );
    assert.deepEqual(
      result.trainers.map((row) => row.id),
      ["otg"]
    );
  });

  it("keeps a name match that sits outside the search radius", () => {
    const result = filterExploreTrainersInArea(
      [otg, other],
      EMPTY_TRAINER_FILTERS,
      "elena vasquez",
      sanDiego,
      { radiusMiles: 7 }
    );
    assert.deepEqual(
      result.trainers.map((row) => row.id),
      ["other"]
    );
  });
});
