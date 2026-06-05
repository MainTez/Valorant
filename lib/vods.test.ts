import assert from "node:assert/strict";
import test from "node:test";
import {
  MATCH_VOD_MAX_FILE_BYTES,
  VOD_CLIP_MAX_FILE_BYTES,
  assertValidMatchVodUpload,
  assertValidVodClipUpload,
  buildMatchVodObjectPath,
  buildVodClipObjectPath,
  canDeleteMatch,
  isMatchVodPathForMatch,
  isMatchVodPathForTeam,
  isVodClipPathForTeam,
  resolveMatchVodSource,
  resolveVodClipSource,
  sanitizeMatchVodFileName,
  sanitizeVodClipFileName,
  stripVodStorageProviderPrefix,
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
  assert.doesNotThrow(() =>
    assertValidMatchVodUpload({
      contentType: "video/mp4",
      fileName: "large-review.mp4",
      fileSize: 6 * 1024 * 1024 * 1024,
    }),
  );

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

test("resolveMatchVodSource prefers uploaded VODs when both sources exist", () => {
  assert.deepEqual(
    resolveMatchVodSource({
      vod_storage_path: "team-456/matches/match-123/upload.mp4",
      vod_url: "https://example.com/fallback.mp4",
    }),
    {
      kind: "uploaded",
      path: "team-456/matches/match-123/upload.mp4",
      provider: "supabase",
    },
  );
});

test("match VOD helpers accept R2-prefixed paths", () => {
  const path = "r2:team-456/matches/match-123/upload.mp4";

  assert.deepEqual(stripVodStorageProviderPrefix(path), {
    path: "team-456/matches/match-123/upload.mp4",
    provider: "r2",
  });
  assert.equal(isMatchVodPathForTeam(path, "team-456"), true);
  assert.equal(isMatchVodPathForMatch(path, "team-456", "match-123"), true);
  assert.deepEqual(
    resolveMatchVodSource({
      vod_storage_path: path,
      vod_url: null,
    }),
    {
      kind: "uploaded",
      path,
      provider: "r2",
    },
  );
});

test("resolveMatchVodSource returns external direct video metadata for mp4 URLs", () => {
  assert.deepEqual(
    resolveMatchVodSource({
      vod_storage_path: null,
      vod_url: "https://cdn.example.com/review.mp4?download=1",
    }),
    {
      isDirectVideo: true,
      kind: "external",
      url: "https://cdn.example.com/review.mp4?download=1",
    },
  );
});

test("resolveMatchVodSource returns missing when no source exists", () => {
  assert.deepEqual(
    resolveMatchVodSource({
      vod_storage_path: null,
      vod_url: null,
    }),
    { kind: "missing" },
  );
});

test("canDeleteMatch allows admins, coaches, and the match creator", () => {
  assert.equal(canDeleteMatch({ createdBy: "user-1", role: "admin", userId: "user-2" }), true);
  assert.equal(canDeleteMatch({ createdBy: "user-1", role: "coach", userId: "user-2" }), true);
  assert.equal(canDeleteMatch({ createdBy: "user-1", role: "player", userId: "user-1" }), true);
  assert.equal(canDeleteMatch({ createdBy: "user-1", role: "player", userId: "user-2" }), false);
});

test("sanitizeVodClipFileName preserves supported clip extensions", () => {
  assert.equal(sanitizeVodClipFileName(" Round 18 Retake!!.webm"), "round-18-retake.webm");
  assert.equal(sanitizeVodClipFileName("  .mp4"), "clip.mp4");
});

test("buildVodClipObjectPath nests clips under the team clip folder", () => {
  assert.equal(
    buildVodClipObjectPath({
      fileName: "Round 18 Retake!!.MP4",
      teamId: "team-456",
      uploadId: "clip-123",
    }),
    "team-456/clips/clip-123-round-18-retake.mp4",
  );
});

test("assertValidVodClipUpload accepts webm clips and rejects oversized clips", () => {
  assert.doesNotThrow(() =>
    assertValidVodClipUpload({
      contentType: "video/webm",
      fileName: "retake.webm",
      fileSize: 1024,
    }),
  );

  assert.throws(
    () =>
      assertValidVodClipUpload({
        contentType: "video/mp4",
        fileName: "too-big.mp4",
        fileSize: VOD_CLIP_MAX_FILE_BYTES + 1,
      }),
    /too large/i,
  );
});

test("isVodClipPathForTeam only accepts team scoped clip paths", () => {
  assert.equal(isVodClipPathForTeam("team-456/clips/clip-123-retake.mp4", "team-456"), true);
  assert.equal(isVodClipPathForTeam("team-789/clips/clip-123-retake.mp4", "team-456"), false);
  assert.equal(isVodClipPathForTeam("team-456/matches/clip-123-retake.mp4", "team-456"), false);
});

test("resolveVodClipSource handles uploaded and external clips", () => {
  assert.deepEqual(
    resolveVodClipSource({
      storage_path: "team-456/clips/clip-123-retake.mp4",
      external_url: null,
    }),
    {
      kind: "uploaded",
      path: "team-456/clips/clip-123-retake.mp4",
    },
  );
  assert.deepEqual(
    resolveVodClipSource({
      storage_path: null,
      external_url: "https://cdn.example.com/clip.webm",
    }),
    {
      isDirectVideo: true,
      kind: "external",
      url: "https://cdn.example.com/clip.webm",
    },
  );
});
