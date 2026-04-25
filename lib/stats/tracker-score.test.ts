import assert from "node:assert/strict";
import test from "node:test";
import { buildTrackerScore } from "./tracker-score.ts";

test("buildTrackerScore returns null when no stat inputs are available", () => {
  assert.equal(buildTrackerScore({ sampleSize: 0 }), null);
});

test("buildTrackerScore gives stronger stats a higher score", () => {
  const low = buildTrackerScore({
    sampleSize: 10,
    kdRatio: 0.82,
    acs: 158,
    adr: 105,
    headshotPct: 11,
    winRate: 41,
  });
  const high = buildTrackerScore({
    sampleSize: 10,
    kdRatio: 1.42,
    acs: 288,
    adr: 164,
    headshotPct: 27,
    winRate: 63,
  });

  assert.ok(low);
  assert.ok(high);
  assert.ok(high.value > low.value);
  assert.equal(high.confidenceLabel, "10-match read");
});

test("buildTrackerScore clamps extreme inputs to the 1000 point scale", () => {
  const score = buildTrackerScore({
    sampleSize: 40,
    kdRatio: 9,
    acs: 900,
    adr: 500,
    headshotPct: 100,
    winRate: 100,
  });

  assert.ok(score);
  assert.equal(score.value, 1000);
});
