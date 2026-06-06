import assert from "node:assert/strict";
import test from "node:test";
import { buildTournamentOpponentScout } from "./opponent-scouting.ts";
import type {
  GGArenaMatchup,
  GGArenaMatchupSide,
  GGArenaStandingRow,
  GGArenaStatRow,
} from "../ggarena/normalize.ts";

function side(overrides: Partial<GGArenaMatchupSide>): GGArenaMatchupSide {
  return {
    id: 1,
    clubId: null,
    teamId: 1,
    name: "Example Team",
    logoUrl: null,
    side: "home",
    score: null,
    isSurfBulls: false,
    ...overrides,
  };
}

function matchup(overrides: Partial<GGArenaMatchup>): GGArenaMatchup {
  return {
    id: 10,
    uuid: "matchup-10",
    name: "Surf'n Bulls vs Enemy Team",
    status: "scheduled",
    raw: {},
    competitionId: 1,
    competitionName: "GGarena Valorant",
    divisionId: 3,
    divisionName: "3. divisjon",
    roundName: "Round 6",
    startsAt: "2026-06-10T18:00:00.000Z",
    sides: [
      side({
        id: 20,
        teamId: 20,
        name: "Surf'n Bulls",
        side: "home",
        isSurfBulls: true,
      }),
      side({
        id: 30,
        teamId: 30,
        name: "Enemy Team",
        side: "away",
      }),
    ],
    opponentName: "Enemy Team",
    includesSurfBulls: true,
    surfResult: null,
    scoreline: null,
    playerStats: [],
    ...overrides,
  };
}

function standing(overrides: Partial<GGArenaStandingRow>): GGArenaStandingRow {
  return {
    id: 30,
    name: "Enemy Team",
    scope: "3. divisjon",
    played: 5,
    wins: 4,
    draws: 0,
    losses: 1,
    points: 12,
    rank: 2,
    isSurfBulls: false,
    ...overrides,
  };
}

function stat(overrides: Partial<GGArenaStatRow>): GGArenaStatRow {
  return {
    id: 301,
    name: "Enemy Duelist",
    playerId: 301,
    playerName: "Enemy Duelist",
    teamId: 30,
    teamName: "Enemy Team",
    scope: "3. divisjon",
    isSurfBulls: false,
    metrics: [
      { key: "kills", label: "Kills", value: 42 },
      { key: "deaths", label: "Deaths", value: 30 },
      { key: "assists", label: "Assists", value: 8 },
    ],
    ...overrides,
  };
}

test("opponent scouting combines standings, division results, roster stats, and previous notes", () => {
  const current = matchup({});
  const previousVsSurf = matchup({
    id: 8,
    uuid: "matchup-8",
    name: "Surf'n Bulls vs Enemy Team",
    startsAt: "2026-05-20T18:00:00.000Z",
    sides: [
      side({
        id: 20,
        teamId: 20,
        name: "Surf'n Bulls",
        side: "home",
        score: 9,
        isSurfBulls: true,
      }),
      side({
        id: 30,
        teamId: 30,
        name: "Enemy Team",
        side: "away",
        score: 13,
      }),
    ],
    surfResult: "loss",
    scoreline: "9-13",
  });
  const enemyVsAlpha = matchup({
    id: 9,
    uuid: "matchup-9",
    name: "Enemy Team vs Alpha",
    includesSurfBulls: false,
    opponentName: "Alpha",
    startsAt: "2026-05-27T18:00:00.000Z",
    sides: [
      side({
        id: 30,
        teamId: 30,
        name: "Enemy Team",
        side: "home",
        score: 13,
      }),
      side({
        id: 40,
        teamId: 40,
        name: "Alpha",
        side: "away",
        score: 7,
      }),
    ],
    surfResult: null,
    scoreline: null,
  });

  const scout = buildTournamentOpponentScout({
    matchup: current,
    noteMatchups: [current, previousVsSurf],
    prepNoteEvents: [
      {
        actor_id: "coach",
        verb: "tournament_prep_notes_updated",
        object_id: "8",
        payload: { notes: "They fast hit B after early mid pressure." },
        created_at: "2026-05-21T10:00:00.000Z",
      },
    ],
    scoutingMatchups: [current, previousVsSurf, enemyVsAlpha],
    standings: [standing({})],
    stats: [stat({}), stat({ playerId: 302, name: "Enemy Sentinel", playerName: "Enemy Sentinel", metrics: [{ key: "kills", label: "Kills", value: 18 }] })],
  });

  assert.equal(scout.standing?.rank, 2);
  assert.deepEqual(
    scout.recentResults.map((result) => [result.otherTeamName, result.result, result.scoreline]),
    [
      ["Alpha", "win", "13-7"],
      ["Surf'n Bulls", "win", "13-9"],
    ],
  );
  assert.deepEqual(
    scout.roster.map((player) => player.name),
    ["Enemy Duelist", "Enemy Sentinel"],
  );
  assert.equal(scout.previousNotes[0]?.notes, "They fast hit B after early mid pressure.");
});

test("opponent scouting keeps note history when the old matchup row is no longer loaded", () => {
  const scout = buildTournamentOpponentScout({
    matchup: matchup({}),
    prepNoteEvents: [
      {
        actor_id: "coach",
        verb: "tournament_prep_notes_updated",
        object_id: "old-matchup",
        payload: {
          matchup_starts_at: "2026-05-01T18:00:00.000Z",
          notes: "Punish their lurk after plant.",
          opponent_name: "Enemy Team",
        },
        created_at: "2026-05-02T10:00:00.000Z",
      },
    ],
    scoutingMatchups: [],
    standings: [standing({})],
    stats: [],
  });

  assert.equal(scout.previousNotes.length, 1);
  assert.equal(scout.previousNotes[0]?.playedAt, "2026-05-01T18:00:00.000Z");
  assert.equal(scout.previousNotes[0]?.notes, "Punish their lurk after plant.");
});
