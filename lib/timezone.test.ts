import assert from "node:assert/strict";
import test from "node:test";
import {
  formatNorwayDate,
  formatNorwayDateTime,
  formatNorwayTime,
  fromNorwayDateTimeLocalInput,
  norwayDayBoundsUtc,
  toNorwayDateTimeLocalInput,
} from "./timezone.ts";

test("Norway/CET display uses the Oslo offset instead of server UTC", () => {
  const kickoff = "2026-05-29T15:00:00.000000Z";

  assert.equal(formatNorwayDateTime(kickoff), "29 May, 17:00");
  assert.equal(formatNorwayDate(kickoff), "29 May 2026");
  assert.equal(formatNorwayTime(kickoff), "17:00");
});

test("Norway datetime-local helpers round-trip Oslo wall time", () => {
  const kickoff = "2026-05-29T15:00:00.000000Z";

  assert.equal(toNorwayDateTimeLocalInput(kickoff), "2026-05-29T17:00");
  assert.equal(fromNorwayDateTimeLocalInput("2026-05-29T17:00"), "2026-05-29T15:00:00.000Z");
});

test("Norway day bounds use the Oslo calendar day for database queries", () => {
  assert.deepEqual(norwayDayBoundsUtc("2026-05-29T15:00:00.000000Z"), {
    date: "2026-05-29",
    startIso: "2026-05-28T22:00:00.000Z",
    endIso: "2026-05-29T21:59:59.999Z",
  });
});
