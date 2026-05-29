import assert from "node:assert/strict";
import test from "node:test";
import { selectTournamentDivisions } from "./scope.ts";

test("selectTournamentDivisions keeps every division in a Surf competition, not only Surf's own division", () => {
  const divisions = [
    { id: 1, name: "1. divisjon", competitionId: 77 },
    { id: 2, name: "2. divisjon", competitionId: 77 },
    { id: 3, name: "3. divisjon", competitionId: 77 },
    { id: 4, name: "4. divisjon", competitionId: 77 },
  ];
  const signups = [{ id: 252490, competitionId: 77, divisionId: 4 }];

  assert.deepEqual(
    selectTournamentDivisions({ divisions, signups, configuredDivisionIds: [] }).map((division) => division.id),
    [1, 2, 3, 4],
  );
});

test("selectTournamentDivisions honors explicitly configured division IDs", () => {
  const divisions = [
    { id: 1, name: "1. divisjon", competitionId: 77 },
    { id: 2, name: "2. divisjon", competitionId: 77 },
    { id: 3, name: "3. divisjon", competitionId: 77 },
    { id: 4, name: "4. divisjon", competitionId: 77 },
  ];

  assert.deepEqual(
    selectTournamentDivisions({ divisions, signups: [], configuredDivisionIds: [2, 4] }).map((division) => division.id),
    [2, 4],
  );
});
