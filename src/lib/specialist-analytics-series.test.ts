import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyProfileVisit,
  countByDay,
  listDayKeys,
  periodChange,
  perHundred,
} from "@/lib/specialist-analytics-series";

describe("specialist analytics series", () => {
  it("builds one point per calendar day, including zeros", () => {
    const keys = listDayKeys(new Date("2026-11-05T20:00:00.000Z"), 3);
    assert.equal(keys.length, 3);
    assert.equal(keys[2], "2026-11-05");
    const series = countByDay(
      ["2026-11-05T18:00:00.000Z", "2026-11-05T19:00:00.000Z"],
      keys
    );
    assert.deepEqual(
      series.map((point) => point.value),
      [0, 0, 2]
    );
  });

  it("does not invent a percent when the previous period was empty", () => {
    assert.equal(periodChange(4, 0).percentChange, null);
    assert.equal(periodChange(4, 0).direction, "up");
    assert.equal(periodChange(8, 4).percentChange, 100);
  });

  it("classifies profile views only from stored referrer fields", () => {
    assert.equal(
      classifyProfileVisit({ referrer_host: "www.google.com" }),
      "search"
    );
    assert.equal(
      classifyProfileVisit({ referrer_host: null, utm_source: null, utm_medium: null }),
      "direct"
    );
    assert.equal(
      classifyProfileVisit({ referrer_host: "instagram.com" }),
      "other"
    );
  });

  it("skips a rate when the denominator is zero", () => {
    assert.equal(perHundred(3, 0), null);
    assert.equal(perHundred(1, 4), 25);
  });
});
