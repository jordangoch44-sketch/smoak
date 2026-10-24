import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rosterWeekChips } from "@/lib/coaching/coach-workout";
import type { CoachWorkout } from "@/types/coaching";

function workout(
  partial: Pick<CoachWorkout, "id" | "dateKey" | "title" | "status">
): CoachWorkout {
  return {
    relationshipId: "r",
    specialistId: "s",
    clientUserId: "c",
    note: "",
    exercises: [],
    clientLog: null,
    sentAt: "2026-10-01T00:00:00.000Z",
    startedAt: null,
    completedAt: null,
    completionNotifiedAt: null,
    completionSeenAt: null,
    ...partial,
  };
}

describe("roster week chips", () => {
  const saturday = new Date(2026, 9, 24);

  it("keeps this Sunday–Saturday week and marks finished, ahead, and missed days", () => {
    const chips = rosterWeekChips(
      [
        workout({ id: "old", dateKey: "2026-10-14", title: "Legs", status: "completed" }),
        workout({ id: "missed", dateKey: "2026-10-18", title: "Push", status: "sent" }),
        workout({ id: "started", dateKey: "2026-10-20", title: "Pull", status: "started" }),
        workout({ id: "done", dateKey: "2026-10-22", title: "Legs", status: "completed" }),
        workout({ id: "today", dateKey: "2026-10-24", title: "Conditioning", status: "sent" }),
        workout({ id: "next", dateKey: "2026-10-25", title: "Next", status: "sent" }),
      ],
      saturday
    );

    assert.deepEqual(
      chips.map((chip) => [chip.id, chip.when, chip.mark]),
      [
        ["missed", "Oct 18", "missed"],
        ["started", "Oct 20", "missed"],
        ["done", "Oct 22", "completed"],
        ["today", "Oct 24", "upcoming"],
      ]
    );
  });
});
