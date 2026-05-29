import assert from "node:assert/strict";
import test from "node:test";
import {
  findTournamentStatForStanding,
  getDefaultTournamentStatKey,
  groupTournamentStatRows,
  getTournamentStatRowKey,
} from "./tournament-stats.ts";
import type { GGArenaStandingRow, GGArenaStatRow } from "./normalize.ts";

function stat(overrides: Partial<GGArenaStatRow>): GGArenaStatRow {
  return {
    id: 1,
    name: "Example Team",
    scope: "1. divisjon",
    isSurfBulls: false,
    metrics: [{ key: "kills", label: "Kills", value: 10 }],
    ...overrides,
  };
}

function standing(overrides: Partial<GGArenaStandingRow>): GGArenaStandingRow {
  return {
    id: 1,
    name: "Example Team",
    scope: "1. divisjon",
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    points: 0,
    rank: 1,
    isSurfBulls: false,
    ...overrides,
  };
}

test("tournament stats group rows by division and pick Surf'n Bulls by default", () => {
  const rows = [
    stat({ id: 10, name: "Alpha", scope: "1. divisjon" }),
    stat({ id: 20, name: "Surf'n Bulls", scope: "2. divisjon", isSurfBulls: true }),
    stat({ id: 30, name: "Bravo", scope: "2. divisjon" }),
  ];

  const groups = groupTournamentStatRows(rows);

  assert.deepEqual(
    groups.map((group) => [group.scope, group.rows.map((row) => row.name)]),
    [
      ["1. divisjon", ["Alpha"]],
      ["2. divisjon", ["Surf'n Bulls", "Bravo"]],
    ],
  );
  assert.equal(getDefaultTournamentStatKey(rows), getTournamentStatRowKey(rows[1]));
});

test("a standings row opens the matching tournament stat row in the same division", () => {
  const rows = [
    stat({ id: 10, name: "Bravo", scope: "1. divisjon" }),
    stat({ id: 30, name: "Bravo", scope: "2. divisjon" }),
    stat({ id: 40, name: "Charlie", scope: "2. divisjon" }),
  ];

  const matched = findTournamentStatForStanding(
    standing({ id: 30, name: "Bravo", scope: "2. divisjon" }),
    rows,
  );

  assert.equal(matched?.name, "Bravo");
  assert.equal(matched?.scope, "2. divisjon");
  assert.equal(getTournamentStatRowKey(matched), getTournamentStatRowKey(rows[1]));
});
