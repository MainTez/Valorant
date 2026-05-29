import assert from "node:assert/strict";
import test from "node:test";
import { buildTournamentOptInSummary } from "./opt-in.ts";

test("tournament opt-in summary counts in, out, and pending players", () => {
  const summary = buildTournamentOptInSummary({
    currentUserId: "user-2",
    members: [
      { id: "user-1", display_name: "MainTez", email: "main@example.com" },
      { id: "user-2", display_name: "TrePinne", email: "tre@example.com" },
      { id: "user-3", display_name: null, email: "nomiar@example.com" },
    ],
    optIns: [
      { user_id: "user-1", status: "in", updated_at: "2026-05-29T10:00:00.000Z" },
      { user_id: "user-2", status: "out", updated_at: "2026-05-29T10:01:00.000Z" },
    ],
  });

  assert.equal(summary.optedInCount, 1);
  assert.equal(summary.optedOutCount, 1);
  assert.equal(summary.pendingCount, 1);
  assert.equal(summary.currentUserStatus, "out");
  assert.deepEqual(
    summary.members.map((member) => [member.displayName, member.status]),
    [
      ["MainTez", "in"],
      ["nomiar", null],
      ["TrePinne", "out"],
    ],
  );
});
