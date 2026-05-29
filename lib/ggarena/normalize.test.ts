import assert from "node:assert/strict";
import test from "node:test";
import {
  matchesSurfBulls,
  normalizeMatchup,
  normalizeSignup,
  normalizeStandingRows,
  normalizeStatRows,
} from "./normalize.ts";

const context = {
  clubId: 101,
  teamId: 202,
  clubQuery: "Surf'n Bulls",
};

test("matchesSurfBulls accepts configured IDs and name variants", () => {
  assert.equal(matchesSurfBulls({ club_id: 101 }, context), true);
  assert.equal(matchesSurfBulls({ team: { id: 202 } }, context), true);
  assert.equal(matchesSurfBulls({ name: "Surf n Bulls Blue" }, context), true);
  assert.equal(matchesSurfBulls({ name: "Molgarians" }, context), false);
});

test("normalizeSignup pulls team, club and competition IDs from nested GGarena shapes", () => {
  const signup = normalizeSignup({
    id: 9,
    team: { id: 202, name: "Surf'n Bulls" },
    club: { id: 101, name: "Surf'n Bulls" },
    competition: { id: 77, name: "Good Game-ligaen Valorant" },
    division_id: 33,
  });

  assert.ok(signup);
  assert.equal(signup.name, "Surf'n Bulls");
  assert.equal(signup.teamId, 202);
  assert.equal(signup.clubId, 101);
  assert.equal(signup.competitionId, 77);
  assert.equal(signup.divisionId, 33);
});

test("normalizeMatchup identifies opponent and start time for Surf'n Bulls fixtures", () => {
  const matchup = normalizeMatchup(
    {
      id: 44,
      status: "scheduled",
      starts_at: "2026-06-01T18:00:00+02:00",
      round: { name: "Round 3" },
      division: { id: 33, name: "Division 2" },
      teams: [
        { team: { id: 202, name: "Surf'n Bulls" }, score: null },
        { team: { id: 303, name: "Oslo Aim" }, score: null },
      ],
    },
    context,
  );

  assert.ok(matchup);
  assert.equal(matchup.includesSurfBulls, true);
  assert.equal(matchup.opponentName, "Oslo Aim");
  assert.equal(matchup.roundName, "Round 3");
  assert.equal(matchup.divisionId, 33);
});

test("normalizeMatchup handles live GGarena signup sides and start_time", () => {
  const matchup = normalizeMatchup(
    {
      id: 256707,
      start_time: "2026-05-29T15:00:00.000000Z",
      signups: [
        {
          id: 252490,
          name: "Surf'n Bulls",
          team: { id: 201287, name: "Surf'n Bulls" },
          side: "home",
        },
        {
          id: 252031,
          name: "Rusty DuckTape",
          team: { id: 196067, name: "Rusty DuckTape" },
          side: "away",
        },
      ],
    },
    { ...context, teamId: 201287 },
  );

  assert.ok(matchup);
  assert.equal(matchup.includesSurfBulls, true);
  assert.equal(matchup.opponentName, "Rusty DuckTape");
  assert.equal(matchup.startsAt, "2026-05-29T15:00:00.000000Z");
});

test("standing normalizer preserves division scope for all table payloads", () => {
  const standings = normalizeStandingRows(
    {
      data: {
        rows: [
          { rank: 1, team: { name: "Surf'n Bulls", id: 202 }, played: 4, wins: 3, losses: 1, points: 9 },
          { rank: 2, team: { name: "Oslo Aim" }, played: 4, wins: 2, losses: 2, points: 6 },
        ],
      },
    },
    context,
    "Division 1",
  );

  assert.equal(standings.length, 2);
  assert.equal(standings[0]?.isSurfBulls, true);
  assert.equal(standings[0]?.points, 9);
  assert.equal(standings[0]?.scope, "Division 1");
  assert.equal(standings[1]?.scope, "Division 1");
});

test("stat normalizer keeps every numeric tournament metric instead of truncating to assists", () => {
  const stats = normalizeStatRows(
    {
      data: [
        {
          player: { name: "MainTez" },
          assists: 18,
          combat_score: 244.5,
          damage: 3120,
          deaths: 31,
          first_bloods: 7,
          headshots: 44,
          kills: 42,
          user_id: 7,
        },
      ],
    },
    "Division 3",
    context,
  );

  assert.equal(stats.length, 1);
  assert.equal(stats[0]?.name, "MainTez");
  assert.deepEqual(
    stats[0]?.metrics.map((metric) => metric.key),
    ["assists", "combat_score", "damage", "deaths", "first_bloods", "headshots", "kills"],
  );
});
