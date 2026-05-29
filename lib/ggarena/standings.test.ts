import assert from "node:assert/strict";
import test from "node:test";
import {
  groupStandingRows,
  isStandingGroupOpenByDefault,
} from "./standings.ts";
import type { GGArenaStandingRow } from "./normalize.ts";

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

test("groupStandingRows keeps teams under expandable division groups", () => {
  const groups = groupStandingRows([
    standing({ id: 10, name: "Alpha", scope: "1. divisjon" }),
    standing({ id: 20, name: "Surf'n Bulls", scope: "2. divisjon", isSurfBulls: true }),
    standing({ id: 30, name: "Bravo", scope: "2. divisjon", rank: 2 }),
    standing({ id: 40, name: "Charlie", scope: "4. divisjon" }),
  ]);

  assert.equal(groups.length, 3);
  assert.deepEqual(
    groups.map((group) => [group.scope, group.rows.map((row) => row.name)]),
    [
      ["1. divisjon", ["Alpha"]],
      ["2. divisjon", ["Surf'n Bulls", "Bravo"]],
      ["4. divisjon", ["Charlie"]],
    ],
  );
});

test("standings rows are sorted from highest to lowest points inside each division", () => {
  const groups = groupStandingRows([
    standing({ id: 10, name: "Alpha", points: 3, rank: 3 }),
    standing({ id: 20, name: "Bravo", points: 9, rank: 1 }),
    standing({ id: 30, name: "Charlie", points: 6, rank: 2 }),
    standing({ id: 40, name: "Delta", points: null, rank: null }),
  ]);

  assert.deepEqual(
    groups[0]?.rows.map((row) => row.name),
    ["Bravo", "Charlie", "Alpha", "Delta"],
  );
});

test("only Surf's division opens by default when multiple standings groups exist", () => {
  const groups = groupStandingRows([
    standing({ id: 10, name: "Alpha", scope: "1. divisjon" }),
    standing({ id: 20, name: "Surf'n Bulls", scope: "2. divisjon", isSurfBulls: true }),
  ]);

  assert.equal(isStandingGroupOpenByDefault(groups[0], groups.length), false);
  assert.equal(isStandingGroupOpenByDefault(groups[1], groups.length), true);
});
