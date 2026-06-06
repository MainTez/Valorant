import assert from "node:assert/strict";
import test from "node:test";
import { buildPlayerImprovementCards } from "./player-improvements.ts";
import type { NormalizedMatch } from "../../types/domain.ts";

test("player improvement cards point at current act stat problems", () => {
  const cards = buildPlayerImprovementCards(
    [
      match({ agent: "Jett", map: "Haven", result: "loss", kills: 8, deaths: 18, acs: 132, adr: 91, headshotPct: 12 }),
      match({ agent: "Jett", map: "Haven", result: "loss", kills: 11, deaths: 17, acs: 151, adr: 102, headshotPct: 13 }),
      match({ agent: "Sova", map: "Bind", result: "win", kills: 16, deaths: 14, acs: 205, adr: 136, headshotPct: 17 }),
    ],
    { actLabel: "E10 A3" },
  );

  assert.equal(cards.length, 3);
  assert.match(cards[0]?.evidence ?? "", /E10 A3/);
  assert.ok(cards.some((card) => /K\/D|ACS|HS|Haven|Jett/.test(card.evidence)));
  assert.ok(cards.every((card) => card.focus.length > 20));
});

test("player improvement cards include assigned review action context", () => {
  const cards = buildPlayerImprovementCards(
    [
      match({ result: "win", kills: 24, deaths: 12, acs: 280, adr: 175, headshotPct: 24 }),
      match({ result: "win", kills: 19, deaths: 13, acs: 245, adr: 151, headshotPct: 22 }),
    ],
    {
      actLabel: "E10 A3",
      reviewActions: ["Stop re-peeking garage before the flash pops"],
    },
  );

  assert.ok(cards.some((card) => card.id === "coach-action"));
  assert.match(cards.map((card) => card.focus).join(" "), /garage/);
});

function match(overrides: Partial<NormalizedMatch>): NormalizedMatch {
  return {
    matchId: crypto.randomUUID(),
    startedAt: "2026-06-06T12:00:00.000Z",
    map: "Ascent",
    mode: "Competitive",
    agent: "Omen",
    result: "loss",
    scoreTeam: 9,
    scoreOpponent: 13,
    kills: 12,
    deaths: 15,
    assists: 4,
    acs: 180,
    adr: 118,
    headshotPct: 16,
    rrChange: -16,
    rankAfter: "Diamond 1",
    raw: { meta: { season: "e10a3" } },
    ...overrides,
  };
}
