import assert from "node:assert/strict";
import test from "node:test";
import {
  buildReviewActionDescription,
  parseReviewActionDescription,
} from "./review-actions.ts";

test("review action descriptions keep the user note and source link", () => {
  const description = buildReviewActionDescription({
    body: "Stop dry peeking retake. Wait for flash.",
    source: {
      href: "/vods/match-1",
      label: "VOD vs Demure and mindful",
      meta: ["Map: Haven", "Score: 13-11"],
      type: "vod",
    },
  });

  assert.match(description, /Stop dry peeking retake/);
  assert.match(description, /Open: \/vods\/match-1/);
  assert.match(description, /- Map: Haven/);

  assert.deepEqual(parseReviewActionDescription(description), {
    body: "Stop dry peeking retake. Wait for flash.",
    href: "/vods/match-1",
    label: "VOD vs Demure and mindful",
    type: "vod",
  });
});

test("plain task descriptions are not review actions", () => {
  assert.equal(parseReviewActionDescription("Normal task"), null);
  assert.equal(parseReviewActionDescription(null), null);
});
