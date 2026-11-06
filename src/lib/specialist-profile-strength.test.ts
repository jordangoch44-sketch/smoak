import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dueProfileReminder,
  getProfilePublicationGaps,
  profileRemindersComplete,
  resolveSpecialistActivationPhase,
  scoreProfileStrength,
  type ProfileStrengthSource,
} from "@/lib/specialist-profile-strength";

function blank(overrides: Partial<ProfileStrengthSource> = {}): ProfileStrengthSource {
  return {
    name: "",
    title: "",
    profession: "",
    city: "",
    zipCode: "",
    phone: "",
    email: "",
    gender: "",
    specialty: [],
    trainingStyle: "",
    trainingOptions: [],
    serviceType: "",
    profilePhotoUrl: "",
    photoNotes: "",
    introVideoUrl: "",
    videoNotes: "",
    bio: "",
    certifications: [],
    pricePerSession: 0,
    pricePerSessionMin: 0,
    pricePerSessionMax: 0,
    ...overrides,
  };
}

function photos(count: number): string {
  return Array.from({ length: count }, (_, index) => `https://cdn.smoac.test/p${index}.jpg`).join(
    "\n"
  );
}

function completeSource(): ProfileStrengthSource {
  return blank({
    name: "North Studio",
    title: "Strength coach",
    profession: "Personal Trainer",
    city: "San Diego",
    zipCode: "92101",
    phone: "6195550100",
    email: "coach@example.com",
    gender: "female",
    specialty: ["Strength"],
    trainingStyle: "Direct and calm",
    trainingOptions: ["in-person"],
    serviceType: "in-person",
    profilePhotoUrl: "https://cdn.smoac.test/avatar.jpg",
    photoNotes: photos(5),
    introVideoUrl: "https://cdn.smoac.test/intro.mp4",
    bio: "I coach busy adults through strength training that fits a normal week. Sessions are clear, progressive, and built around how you actually recover between work, family, and the days you would rather stay home.",
    certifications: [{ name: "CSCS" }],
    pricePerSession: 120,
    pricePerSessionMin: 90,
    pricePerSessionMax: 120,
  });
}

describe("profile strength", () => {
  it("scores an empty saved profile at zero", () => {
    const strength = scoreProfileStrength(blank());
    assert.equal(strength.score, 0);
    assert.equal(strength.label, "Getting Started");
    assert.equal(
      strength.sections.filter((section) => section.complete).length,
      0
    );
    assert.equal(strength.recommendation?.sectionId, "media");
    assert.match(strength.recommendation?.href ?? "", /focus=avatar/);
  });

  it("ignores placeholder photos and whitespace", () => {
    const strength = scoreProfileStrength(
      blank({
        name: "   ",
        profilePhotoUrl: "https://picsum.photos/200",
        photoNotes: "/trainers/placeholder.jpg",
        bio: "   short   ",
        certifications: [{ name: " " }],
      })
    );
    assert.equal(strength.score, 0);
    assert.equal(strength.sections.find((section) => section.id === "media")?.points, 0);
  });

  it("awards partial credit only for saved content", () => {
    const strength = scoreProfileStrength(
      blank({
        name: "North Studio",
        title: "Strength coach",
        profession: "Personal Trainer",
        city: "San Diego",
        email: "coach@example.com",
        specialty: ["Strength"],
        bio: "I coach adults who want a plan they can keep.",
      })
    );
    const basic = strength.sections.find((section) => section.id === "basic");
    const specialties = strength.sections.find((section) => section.id === "specialties");
    const bio = strength.sections.find((section) => section.id === "bio");
    assert.equal(basic?.complete, true);
    assert.equal(basic?.points, 15);
    assert.equal(specialties?.points, 9);
    assert.equal(specialties?.complete, false);
    assert.equal(bio?.points, 8);
    assert.equal(bio?.complete, false);
    assert.equal(strength.label, "Getting Started");
    assert.ok(strength.score < 50);
  });

  it("reaches excellent only when every weighted section is filled", () => {
    const strength = scoreProfileStrength(completeSource());
    assert.equal(strength.score, 100);
    assert.equal(strength.label, "Excellent");
    assert.equal(strength.recommendation, null);
    assert.ok(strength.sections.every((section) => section.complete));
    assert.equal(profileRemindersComplete(strength), true);
  });

  it("recommends the highest-value gap and never a finished section", () => {
    const readyMedia = completeSource();
    readyMedia.bio = "Too short to count as a bio.";
    readyMedia.certifications = [];
    const strength = scoreProfileStrength(readyMedia);
    assert.equal(strength.recommendation?.sectionId, "bio");
    assert.equal(strength.recommendation?.action, "Complete Bio");
    assert.match(strength.recommendation?.href ?? "", /focus=bio/);
    assert.notEqual(
      strength.sections.find((section) => section.id === strength.recommendation?.sectionId)
        ?.complete,
      true
    );
  });

  it("asks for five photos before an introduction video", () => {
    const strength = scoreProfileStrength(
      blank({
        profilePhotoUrl: "https://cdn.smoac.test/avatar.jpg",
        photoNotes: photos(2),
      })
    );
    assert.equal(strength.recommendation?.action, "Add Photos");
    assert.match(strength.recommendation?.message ?? "", /five quality photos/);
    const withGallery = scoreProfileStrength(
      blank({
        profilePhotoUrl: "https://cdn.smoac.test/avatar.jpg",
        photoNotes: photos(5),
      })
    );
    assert.equal(withGallery.recommendation?.action, "Add Video");
  });

  it("labels the bands at the boundaries", () => {
    const almost = completeSource();
    almost.introVideoUrl = "";
    almost.certifications = [];
    const strength = scoreProfileStrength(almost);
    assert.equal(strength.score, 88);
    assert.equal(strength.label, "Excellent");
    const mid = blank({
      name: "North Studio",
      title: "Strength coach",
      profession: "Personal Trainer",
      city: "San Diego",
      email: "coach@example.com",
      specialty: ["Strength"],
      trainingStyle: "Calm",
      profilePhotoUrl: "https://cdn.smoac.test/avatar.jpg",
      photoNotes: photos(5),
      bio: "I coach busy adults through strength training that fits a normal week. Sessions are clear, progressive, and built around how you actually recover between work, family, and the days you would rather stay home.",
    });
    const midScore = scoreProfileStrength(mid);
    assert.equal(midScore.score, 68);
    assert.equal(midScore.label, "Strong");
  });
});

describe("publication and approval phase", () => {
  it("blocks publication until the go-live fields are saved", () => {
    const gaps = getProfilePublicationGaps(blank({ name: "North Studio" }));
    assert.ok(gaps.some((gap) => gap.id === "photo"));
    assert.ok(gaps.some((gap) => gap.id === "price"));
    assert.equal(getProfilePublicationGaps(completeSource()).length, 0);
  });

  it("moves from review to changes, then to a live listing", () => {
    assert.equal(
      resolveSpecialistActivationPhase({
        profileStatus: "PENDING_APPROVAL",
        catalogPublished: false,
        catalogKnown: true,
      }),
      "under-review"
    );
    assert.equal(
      resolveSpecialistActivationPhase({
        profileStatus: "REJECTED",
        catalogPublished: false,
        catalogKnown: true,
      }),
      "changes-requested"
    );
    assert.equal(
      resolveSpecialistActivationPhase({
        profileStatus: "APPROVED",
        catalogPublished: false,
        catalogKnown: false,
      }),
      "published"
    );
    assert.equal(
      resolveSpecialistActivationPhase({
        profileStatus: "APPROVED",
        catalogPublished: false,
        catalogKnown: true,
      }),
      "approved-unpublished"
    );
    assert.equal(
      resolveSpecialistActivationPhase({
        profileStatus: "APPROVED",
        catalogPublished: true,
        catalogKnown: true,
      }),
      "published"
    );
    assert.equal(
      resolveSpecialistActivationPhase({
        profileStatus: "DRAFT",
        catalogPublished: false,
        catalogKnown: true,
      }),
      null
    );
  });
});

describe("incomplete profile reminders", () => {
  const submitted = "2026-11-01T00:00:00.000Z";

  function at(iso: string) {
    return dueProfileReminder({
      profileStatus: "PENDING_APPROVAL",
      submittedAt: submitted,
      now: new Date(iso),
      score: 40,
      sent48h: false,
      sentWeek: false,
    });
  }

  it("waits 48 hours, then sends one follow-up in the day 5 window", () => {
    assert.equal(at("2026-11-02T23:00:00.000Z"), null);
    assert.equal(at("2026-11-03T00:00:00.000Z"), "incomplete_48h");
    assert.equal(at("2026-11-06T00:00:00.000Z"), "incomplete_week");
    assert.equal(at("2026-11-12T00:00:00.000Z"), null);
  });

  it("does not stack both reminders or repeat one that already sent", () => {
    assert.equal(
      dueProfileReminder({
        profileStatus: "PENDING_APPROVAL",
        submittedAt: submitted,
        now: new Date("2026-11-06T12:00:00.000Z"),
        score: 40,
        sent48h: false,
        sentWeek: false,
      }),
      "incomplete_week"
    );
    assert.equal(
      dueProfileReminder({
        profileStatus: "APPROVED",
        submittedAt: submitted,
        now: new Date("2026-11-03T12:00:00.000Z"),
        score: 79,
        sent48h: true,
        sentWeek: false,
      }),
      null
    );
    assert.equal(
      dueProfileReminder({
        profileStatus: "APPROVED",
        submittedAt: submitted,
        now: new Date("2026-11-03T12:00:00.000Z"),
        score: 80,
        sent48h: false,
        sentWeek: false,
      }),
      null
    );
    assert.equal(
      dueProfileReminder({
        profileStatus: "REJECTED",
        submittedAt: submitted,
        now: new Date("2026-11-06T12:00:00.000Z"),
        score: 20,
        sent48h: false,
        sentWeek: false,
      }),
      null
    );
  });
});
