import assert from "node:assert/strict";
import test from "node:test";
import {
  getPersonalRoutineName,
  personalizeRoutineForUser,
} from "./player-routines.ts";
import type { RoutineRow } from "@/types/domain";

const baseRoutine: RoutineRow = {
  id: "00000000-0000-0000-0000-000000000001",
  team_id: "team-1",
  title: "Daily practice",
  scope: "daily",
  created_at: "2026-04-24T00:00:00.000Z",
  items: [{ id: "default", label: "Default" }],
};

test("personal routines match the named players by email or display name", () => {
  const players = [
    { email: "maintez@example.com", display_name: null, expected: "MainTez" },
    { email: "player@example.com", display_name: "Ashmumu", expected: "Ashmumu" },
    { email: "johan.jojo@example.com", display_name: null, expected: "Johan jojo" },
    { email: "kittypolo@example.com", display_name: null, expected: "Kittypolo" },
    { email: "player@example.com", display_name: "Hopped", expected: "Hopped" },
  ];

  for (const player of players) {
    assert.equal(getPersonalRoutineName(player), player.expected);
    const routine = personalizeRoutineForUser(baseRoutine, player);
    assert.notEqual(routine?.items[0]?.id, "default");
  }
});

test("unknown users keep the team default daily routine", () => {
  const routine = personalizeRoutineForUser(baseRoutine, {
    email: "unknown@example.com",
    display_name: "Unknown",
  });

  assert.deepEqual(routine, baseRoutine);
});
