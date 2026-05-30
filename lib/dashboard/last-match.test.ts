import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDashboardLastMatchResult,
  buildDashboardRecentResults,
} from "./last-match.ts";
import type { GGArenaMatchup } from "../ggarena/normalize.ts";
import type { MatchRow } from "../../types/domain.ts";

function match(overrides: Partial<MatchRow>): MatchRow {
  return {
    id: "match-1",
    team_id: "team-1",
    opponent: "Local Wolves",
    type: "official",
    date: "2026-04-20",
    map: "Haven",
    score_us: 13,
    score_them: 9,
    result: "win",
    notes: null,
    vod_url: null,
    vod_content_type: null,
    vod_original_name: null,
    vod_size_bytes: null,
    vod_storage_path: null,
    created_by: null,
    created_at: "2026-04-20T20:00:00.000Z",
    ...overrides,
  };
}

function tournamentMatchup(overrides: Partial<GGArenaMatchup>): GGArenaMatchup {
  return {
    id: 256621,
    uuid: "matchup-256621",
    name: "Surf'n Bulls vs Rotaryon Zeviatán",
    status: "finished",
    raw: {},
    competitionId: 10,
    competitionName: "GGarena Valorant",
    divisionId: 3,
    divisionName: "3. divisjon",
    roundName: "Round 5",
    startsAt: "2026-04-24T18:00:00.000Z",
    sides: [],
    opponentName: "Rotaryon Zeviatán",
    includesSurfBulls: true,
    surfResult: "loss",
    scoreline: "0-2",
    playerStats: [],
    ...overrides,
  };
}

test("dashboard last match result prefers the newest completed GGarena result", () => {
  const result = buildDashboardLastMatchResult({
    localMatches: [match({})],
    tournamentMatchups: [tournamentMatchup({})],
  });

  assert.deepEqual(result, {
    id: "ggarena-matchup-256621",
    source: "ggarena",
    result: "loss",
    scoreline: "0-2",
    opponent: "Rotaryon Zeviatán",
    detail: "3. divisjon · Round 5",
    playedAt: "2026-04-24T18:00:00.000Z",
  });
});

test("dashboard recent results ignore pending tournament matches", () => {
  const results = buildDashboardRecentResults({
    localMatches: [match({ result: "win" })],
    tournamentMatchups: [
      tournamentMatchup({ surfResult: null, scoreline: null, startsAt: "2026-04-25T18:00:00.000Z" }),
      tournamentMatchup({ surfResult: "draw", scoreline: "1-1", startsAt: "2026-04-24T18:00:00.000Z" }),
    ],
  });

  assert.deepEqual(
    results.map((result) => [result.source, result.result]),
    [
      ["ggarena", "draw"],
      ["local", "win"],
    ],
  );
});
