import assert from "node:assert/strict";
import test from "node:test";
import { buildTournamentOptInSummary } from "./opt-in.ts";

const tournamentKey = "surf-n-bulls-active-tournament";

const baseMembers = [
  { id: "user-1", display_name: "MainTez", email: "main@example.com", preferred_valorant_role: "Controller" },
  { id: "user-2", display_name: "TrePinne", email: "tre@example.com", preferred_valorant_role: "Sentinel" },
  { id: "user-3", display_name: "Nomiar", email: "nomiar@example.com", preferred_valorant_role: "Initiator" },
  { id: "user-4", display_name: "Mottas", email: "mottas@example.com", preferred_valorant_role: "Duelist" },
  { id: "user-5", display_name: "Articz", email: "articz@example.com", preferred_valorant_role: "Duelist" },
  { id: "user-6", display_name: "Ash", email: "ash@example.com", preferred_valorant_role: "Sentinel" },
  { id: "user-7", display_name: "Epic Man", email: "epic@example.com", preferred_valorant_role: "Controller" },
];

function optedIn(actorId: string, minute: number) {
  return {
    actor_id: actorId,
    verb: "tournament_opted_in",
    object_id: tournamentKey,
    payload: { status: "in" },
    created_at: `2026-05-29T10:${String(minute).padStart(2, "0")}:00.000Z`,
  };
}

function optedOut(actorId: string, minute: number) {
  return {
    actor_id: actorId,
    verb: "tournament_opted_out",
    object_id: tournamentKey,
    payload: { status: "out" },
    created_at: `2026-05-29T10:${String(minute).padStart(2, "0")}:00.000Z`,
  };
}

function completed(actorId: string, minute: number) {
  return {
    actor_id: actorId,
    verb: "tournament_completed",
    object_id: tournamentKey,
    payload: { action: "complete" },
    created_at: `2026-05-29T10:${String(minute).padStart(2, "0")}:00.000Z`,
  };
}

test("tournament opt-in summary locks the first five and waitlists later opt-ins", () => {
  const summary = buildTournamentOptInSummary({
    currentUserId: "user-6",
    members: baseMembers.slice(0, 6),
    events: [1, 2, 3, 4, 5, 6].map((userNumber) => optedIn(`user-${userNumber}`, userNumber)),
  });

  assert.equal(summary.activeCount, 5);
  assert.equal(summary.waitlistCount, 1);
  assert.equal(summary.optedInCount, 6);
  assert.equal(summary.currentUserStatus, "waitlist");
  assert.equal(summary.currentUserWaitlistPosition, 1);
  assert.deepEqual(
    summary.activeRoster.map((member) => [member.displayName, member.status]),
    [
      ["MainTez", "active"],
      ["TrePinne", "active"],
      ["Nomiar", "active"],
      ["Mottas", "active"],
      ["Articz", "active"],
    ],
  );
  assert.equal(summary.waitlist[0]?.displayName, "Ash");
});

test("waitlist promotion chooses the best role fit when an active player opts out", () => {
  const summary = buildTournamentOptInSummary({
    currentUserId: "user-7",
    members: baseMembers,
    events: [
      optedIn("user-1", 1),
      optedIn("user-2", 2),
      optedIn("user-3", 3),
      optedIn("user-4", 4),
      optedIn("user-5", 5),
      optedIn("user-6", 6),
      optedIn("user-7", 7),
      optedOut("user-1", 8),
    ],
  });

  assert.equal(summary.currentUserStatus, "active");
  assert.equal(summary.waitlist[0]?.userId, "user-6");
  assert.deepEqual(
    summary.activeRoster.map((member) => [member.userId, member.preferredRole]),
    [
      ["user-2", "Sentinel"],
      ["user-3", "Initiator"],
      ["user-4", "Duelist"],
      ["user-5", "Duelist"],
      ["user-7", "Controller"],
    ],
  );
});

test("coach override promotes a waitlisted player and demotes the replaced player", () => {
  const summary = buildTournamentOptInSummary({
    currentUserId: "user-6",
    members: baseMembers.slice(0, 6),
    events: [
      optedIn("user-1", 1),
      optedIn("user-2", 2),
      optedIn("user-3", 3),
      optedIn("user-4", 4),
      optedIn("user-5", 5),
      optedIn("user-6", 6),
      {
        actor_id: "coach-1",
        verb: "tournament_override",
        object_id: tournamentKey,
        payload: {
          action: "promote",
          promoted_user_id: "user-6",
          demoted_user_id: "user-2",
        },
        created_at: "2026-05-29T10:07:00.000Z",
      },
    ],
  });

  assert.equal(summary.currentUserStatus, "active");
  assert.equal(summary.activeRoster.some((member) => member.userId === "user-6"), true);
  assert.equal(summary.members.find((member) => member.userId === "user-2")?.status, "waitlist");
});

test("tournament opt-in summary counts out and pending players", () => {
  const summary = buildTournamentOptInSummary({
    currentUserId: "user-2",
    members: baseMembers.slice(0, 3),
    events: [
      optedIn("user-1", 1),
      optedOut("user-2", 2),
    ],
  });

  assert.equal(summary.activeCount, 1);
  assert.equal(summary.optedOutCount, 1);
  assert.equal(summary.pendingCount, 1);
  assert.equal(summary.currentUserStatus, "out");
});

test("completed tournament resets every player back to pending", () => {
  const summary = buildTournamentOptInSummary({
    currentUserId: "user-1",
    members: baseMembers.slice(0, 6),
    events: [
      optedIn("user-1", 1),
      optedIn("user-2", 2),
      optedIn("user-3", 3),
      optedIn("user-4", 4),
      optedIn("user-5", 5),
      optedIn("user-6", 6),
      optedOut("user-3", 7),
      completed("coach-1", 8),
    ],
  });

  assert.equal(summary.activeCount, 0);
  assert.equal(summary.waitlistCount, 0);
  assert.equal(summary.optedOutCount, 0);
  assert.equal(summary.pendingCount, 6);
  assert.equal(summary.currentUserStatus, null);
  assert.deepEqual(
    summary.members.map((member) => member.status),
    [null, null, null, null, null, null],
  );
});
