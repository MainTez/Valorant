import assert from "node:assert/strict";
import test from "node:test";
import {
  findTournamentStatTeamForStanding,
  getDefaultTournamentStatSelection,
  getTournamentStatPlayerKey,
  getTournamentStatTeamKey,
  groupTournamentStatsByTeam,
} from "./tournament-stats.ts";
import type { GGArenaStandingRow, GGArenaStatRow } from "./normalize.ts";

function stat(overrides: Partial<GGArenaStatRow>): GGArenaStatRow {
  return {
    id: 1,
    name: "Example Player",
    playerId: 1,
    playerName: "Example Player",
    teamId: 10,
    teamName: "Example Team",
    scope: "1. divisjon",
    isSurfBulls: false,
    metrics: [{ key: "kills", label: "Kills", value: 10 }],
    ...overrides,
  };
}

function standing(overrides: Partial<GGArenaStandingRow>): GGArenaStandingRow {
  return {
    id: 10,
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

test("tournament stats group player rows under team dropdowns by division", () => {
  const rows = [
    stat({ id: 101, playerId: 101, name: "MainTez", playerName: "MainTez", teamId: 20, teamName: "Surf'n Bulls", scope: "3. divisjon", isSurfBulls: true }),
    stat({ id: 102, playerId: 102, name: "Icy", playerName: "Icy", teamId: 20, teamName: "Surf'n Bulls", scope: "3. divisjon", isSurfBulls: true }),
    stat({ id: 201, playerId: 201, name: "Enemy Duelist", playerName: "Enemy Duelist", teamId: 30, teamName: "Rotaryon Zeviatán", scope: "3. divisjon" }),
    stat({ id: 301, playerId: 301, name: "Alpha", playerName: "Alpha", teamId: 40, teamName: "Alpha Team", scope: "2. divisjon" }),
  ];

  const groups = groupTournamentStatsByTeam(rows);

  assert.deepEqual(
    groups.map((group) => [
      group.scope,
      group.teams.map((team) => [team.name, team.players.map((player) => player.name)]),
    ]),
    [
      [
        "3. divisjon",
        [
          ["Surf'n Bulls", ["MainTez", "Icy"]],
          ["Rotaryon Zeviatán", ["Enemy Duelist"]],
        ],
      ],
      ["2. divisjon", [["Alpha Team", ["Alpha"]]]],
    ],
  );
});

test("tournament stats include every standings team even before player rows attach", () => {
  const rows = [
    stat({ id: 101, playerId: 101, name: "MainTez", playerName: "MainTez", teamId: 20, teamName: "Surf'n Bulls", scope: "3. divisjon", isSurfBulls: true }),
  ];
  const standings = [
    standing({ id: 20, name: "Surf'n Bulls", scope: "3. divisjon", isSurfBulls: true }),
    standing({ id: 30, name: "Rotaryon Zeviatán", scope: "3. divisjon" }),
  ];

  const groups = groupTournamentStatsByTeam(rows, standings);

  assert.deepEqual(
    groups[0]?.teams.map((team) => [team.name, team.players.map((player) => player.name)]),
    [
      ["Surf'n Bulls", ["MainTez"]],
      ["Rotaryon Zeviatán", []],
    ],
  );
});

test("tournament stats default selection opens Surf'n Bulls and its first player", () => {
  const rows = [
    stat({ id: 201, playerId: 201, name: "Enemy", playerName: "Enemy", teamId: 30, teamName: "Enemy Team" }),
    stat({ id: 101, playerId: 101, name: "MainTez", playerName: "MainTez", teamId: 20, teamName: "Surf'n Bulls", isSurfBulls: true }),
  ];
  const groups = groupTournamentStatsByTeam(rows);
  const surfTeam = groups[0]?.teams.find((team) => team.isSurfBulls) ?? null;

  assert.ok(surfTeam);
  assert.deepEqual(getDefaultTournamentStatSelection(groups), {
    teamKey: getTournamentStatTeamKey(surfTeam),
    playerKey: getTournamentStatPlayerKey(rows[1]),
  });
});

test("a standings row opens the matching tournament stat team in the same division", () => {
  const rows = [
    stat({ id: 101, playerId: 101, name: "Bravo Player", playerName: "Bravo Player", teamId: 10, teamName: "Bravo", scope: "1. divisjon" }),
    stat({ id: 301, playerId: 301, name: "Bravo Player", playerName: "Bravo Player", teamId: 30, teamName: "Bravo", scope: "2. divisjon" }),
    stat({ id: 401, playerId: 401, name: "Charlie Player", playerName: "Charlie Player", teamId: 40, teamName: "Charlie", scope: "2. divisjon" }),
  ];
  const groups = groupTournamentStatsByTeam(rows);

  const matched = findTournamentStatTeamForStanding(
    standing({ id: 30, name: "Bravo", scope: "2. divisjon" }),
    groups,
  );

  assert.equal(matched?.name, "Bravo");
  assert.equal(matched?.scope, "2. divisjon");
  assert.equal(matched?.players[0]?.name, "Bravo Player");
});
