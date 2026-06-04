import assert from "node:assert/strict";
import test from "node:test";
import { filterMatchesToCurrentAct } from "../valorant/acts.ts";
import type { NormalizedMatch } from "../../types/domain.ts";

test("current act filter keeps only matches from the newest known act", () => {
  const matches = [
    match("old-1", "2026-04-10T12:00:00.000Z", { id: "episode-10-act-2", short: "e10a2" }),
    match("new-1", "2026-05-20T12:00:00.000Z", { id: "episode-10-act-3", short: "e10a3" }),
    match("new-2", "2026-05-19T12:00:00.000Z", { id: "episode-10-act-3", short: "e10a3" }),
    match("unknown", "2026-05-21T12:00:00.000Z", null),
  ];

  const scope = filterMatchesToCurrentAct(matches);

  assert.equal(scope.act.key, "episode-10-act-3");
  assert.equal(scope.act.label, "E10 A3");
  assert.equal(scope.totalMatches, 4);
  assert.deepEqual(scope.matches.map((item) => item.matchId), ["new-1", "new-2"]);
});

test("current act filter falls back to all matches when act metadata is missing", () => {
  const matches = [
    match("one", "2026-05-20T12:00:00.000Z", null),
    match("two", "2026-05-19T12:00:00.000Z", null),
  ];

  const scope = filterMatchesToCurrentAct(matches);

  assert.equal(scope.act.key, "unknown-act");
  assert.deepEqual(scope.matches.map((item) => item.matchId), ["one", "two"]);
});

function match(
  matchId: string,
  startedAt: string,
  season: { id: string; short: string } | null,
): NormalizedMatch {
  return {
    matchId,
    startedAt,
    map: "Ascent",
    mode: "competitive",
    agent: "Omen",
    result: "win",
    scoreTeam: 13,
    scoreOpponent: 10,
    kills: 18,
    deaths: 14,
    assists: 6,
    acs: 220,
    adr: 145,
    headshotPct: 24,
    rrChange: null,
    rankAfter: null,
    raw: season ? { meta: { season } } : {},
  };
}
