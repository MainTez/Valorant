import assert from "node:assert/strict";
import test from "node:test";
import {
  MATCH_VOD_MAX_FILE_BYTES,
  assertValidMatchVodUpload,
  buildMatchVodObjectPath,
  isMatchVodPathForMatch,
  isMatchVodPathForTeam,
  sanitizeMatchVodFileName,
} from "./vods.ts";

test("sanitizeMatchVodFileName normalizes spacing and dangerous characters", () => {
  assert.equal(
    sanitizeMatchVodFileName("Grand Finals Game #1!!.MP4"),
    "grand-finals-game-1.mp4",
  );
});

test("sanitizeMatchVodFileName falls back to vod.mp4 when the base name is empty", () => {
  assert.equal(sanitizeMatchVodFileName("   .mp4"), "vod.mp4");
});

test("buildMatchVodObjectPath nests uploads under the team and match ids", () => {
  assert.equal(
    buildMatchVodObjectPath({
      fileName: "Grand Finals Game #1!!.MP4",
      matchId: "match-123",
      teamId: "team-456",
      uploadId: "upload-789",
    }),
    "team-456/matches/match-123/upload-789-grand-finals-game-1.mp4",
  );
});

test("assertValidMatchVodUpload rejects non-mp4 uploads", () => {
  assert.throws(
    () =>
      assertValidMatchVodUpload({
        contentType: "video/webm",
        fileName: "review.webm",
        fileSize: 1024,
      }),
    /MP4/i,
  );
});

test("assertValidMatchVodUpload rejects oversized uploads", () => {
  assert.throws(
    () =>
      assertValidMatchVodUpload({
        contentType: "video/mp4",
        fileName: "review.mp4",
        fileSize: MATCH_VOD_MAX_FILE_BYTES + 1,
      }),
    /too large/i,
  );
});

test("isMatchVodPathForTeam only accepts team scoped match paths", () => {
  assert.equal(
    isMatchVodPathForTeam("team-456/matches/match-123/grand-finals.mp4", "team-456"),
    true,
  );
  assert.equal(
    isMatchVodPathForTeam("team-789/matches/match-123/grand-finals.mp4", "team-456"),
    false,
  );
  assert.equal(
    isMatchVodPathForTeam("team-456/other/match-123/grand-finals.mp4", "team-456"),
    false,
  );
});

test("isMatchVodPathForMatch locks uploads to a single match", () => {
  assert.equal(
    isMatchVodPathForMatch(
      "team-456/matches/match-123/grand-finals.mp4",
      "team-456",
      "match-123",
    ),
    true,
  );
  assert.equal(
    isMatchVodPathForMatch(
      "team-456/matches/match-999/grand-finals.mp4",
      "team-456",
      "match-123",
    ),
    false,
  );
});
