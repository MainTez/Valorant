import assert from "node:assert/strict";
import test from "node:test";
import {
  TOURNAMENT_MATCH_PREP_CHECKLIST,
  buildTournamentMatchPrepSummary,
} from "./match-prep.ts";

test("tournament match prep replays notes, ready states, and checklist events", () => {
  const summary = buildTournamentMatchPrepSummary({
    matchupKey: "match-1",
    roster: [{ userId: "u1" }, { userId: "u2" }],
    events: [
      {
        actor_id: "coach",
        verb: "tournament_prep_notes_updated",
        object_id: "match-1",
        payload: { notes: "Default Haven: deny garage control." },
        created_at: "2026-06-06T10:00:00.000Z",
      },
      {
        actor_id: "u1",
        verb: "tournament_prep_ready_updated",
        object_id: "match-1",
        payload: { ready: true },
        created_at: "2026-06-06T10:01:00.000Z",
      },
      {
        actor_id: "coach",
        verb: "tournament_prep_ready_updated",
        object_id: "match-1",
        payload: { user_id: "u2", ready: true },
        created_at: "2026-06-06T10:02:00.000Z",
      },
      {
        actor_id: "coach",
        verb: "tournament_prep_checklist_updated",
        object_id: "match-1",
        payload: { item_id: "opponent_scouted", checked: true },
        created_at: "2026-06-06T10:03:00.000Z",
      },
    ],
  });

  assert.equal(summary.notes, "Default Haven: deny garage control.");
  assert.equal(summary.readyCount, 2);
  assert.equal(summary.allReady, true);
  assert.equal(summary.readyByUserId.u1?.ready, true);
  assert.equal(summary.readyByUserId.u2?.ready, true);
  assert.equal(summary.checklistDoneCount, 1);
  assert.equal(
    summary.checklist.find((item) => item.id === "opponent_scouted")?.checked,
    true,
  );
});

test("tournament match prep ignores events for other matchups and unchecked checklist items", () => {
  const summary = buildTournamentMatchPrepSummary({
    matchupKey: "match-1",
    roster: [{ userId: "u1" }],
    events: [
      {
        actor_id: "u1",
        verb: "tournament_prep_ready_updated",
        object_id: "match-2",
        payload: { ready: true },
        created_at: "2026-06-06T10:01:00.000Z",
      },
      {
        actor_id: "coach",
        verb: "tournament_prep_checklist_updated",
        object_id: "match-1",
        payload: { item_id: "roles_checked", checked: false },
        created_at: "2026-06-06T10:02:00.000Z",
      },
    ],
  });

  assert.equal(summary.readyCount, 0);
  assert.equal(summary.allReady, false);
  assert.equal(summary.checklistDoneCount, 0);
  assert.equal(summary.checklistTotalCount, TOURNAMENT_MATCH_PREP_CHECKLIST.length);
});
