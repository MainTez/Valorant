import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDashboardNextMatches,
  pickDashboardNextMatch,
} from "./next-match.ts";
import type { GGArenaMatchup } from "../ggarena/normalize.ts";
import type { ScheduleEventRow } from "../../types/domain.ts";

function scheduleEvent(overrides: Partial<ScheduleEventRow>): ScheduleEventRow {
  return {
    id: "event-1",
    team_id: "team-1",
    title: "Team review",
    kind: "review",
    start_at: "2026-05-29T21:00:00.000Z",
    end_at: null,
    participants: [],
    description: null,
    location: "Discord",
    created_by: null,
    created_at: "2026-05-28T10:00:00.000Z",
    ...overrides,
  };
}

function tournamentMatchup(overrides: Partial<GGArenaMatchup>): GGArenaMatchup {
  return {
    id: 77,
    uuid: "matchup-77",
    name: "Surf'n Bulls vs Enemy Team",
    status: "scheduled",
    raw: {},
    competitionId: 10,
    competitionName: "GGarena Valorant",
    divisionId: 2,
    divisionName: "2. divisjon",
    roundName: "Round 3",
    startsAt: "2026-05-29T18:00:00.000Z",
    sides: [],
    opponentName: "Enemy Team",
    includesSurfBulls: true,
    surfResult: null,
    scoreline: null,
    playerStats: [],
    ...overrides,
  };
}

test("dashboard next matches include scheduled and GGarena fixtures in time order", () => {
  const matches = buildDashboardNextMatches({
    upcomingEvents: [
      scheduleEvent({
        id: "practice-1",
        title: "Team review",
        kind: "review",
        start_at: "2026-05-29T16:00:00.000Z",
      }),
      scheduleEvent({
        id: "scrim-1",
        title: "Scrim vs Wolves",
        kind: "scrim",
        start_at: "2026-05-29T19:00:00.000Z",
      }),
      scheduleEvent({
        id: "match-1",
        title: "League Match vs Lynx",
        kind: "match",
        start_at: "2026-05-30T18:00:00.000Z",
      }),
    ],
    tournamentMatchups: [
      tournamentMatchup({
        id: 88,
        uuid: "matchup-88",
        opponentName: "Earlier Enemy",
        startsAt: "2026-05-29T18:00:00.000Z",
      }),
    ],
  });

  assert.deepEqual(
    matches.map((match) => [match.source, match.title, match.startAt]),
    [
      ["ggarena", "Earlier Enemy", "2026-05-29T18:00:00.000Z"],
      ["schedule", "Scrim vs Wolves", "2026-05-29T19:00:00.000Z"],
      ["schedule", "League Match vs Lynx", "2026-05-30T18:00:00.000Z"],
    ],
  );
});

test("dashboard next match falls back to the upcoming GGarena tournament fixture", () => {
  const picked = pickDashboardNextMatch({
    upcomingEvents: [scheduleEvent({ kind: "review" })],
    tournamentMatchups: [
      tournamentMatchup({
        sides: [
          {
            id: 1,
            clubId: null,
            teamId: 201287,
            name: "Surf'n Bulls",
            logoUrl: null,
            side: "home",
            score: null,
            isSurfBulls: true,
          },
          {
            id: 2,
            clubId: null,
            teamId: 303,
            name: "Enemy Team",
            logoUrl: "https://ggarena.example/enemy.png",
            side: "away",
            score: null,
            isSurfBulls: false,
          },
        ],
      }),
    ],
  });

  assert.deepEqual(picked, {
    id: "ggarena-matchup-77",
    title: "Enemy Team",
    opponentLogoUrl: "https://ggarena.example/enemy.png",
    kind: "tournament",
    startAt: "2026-05-29T18:00:00.000Z",
    location: "2. divisjon · Round 3",
    detailsHref: "/tournaments?match=77#match-77",
    detailsLabel: "View tournament →",
    source: "ggarena",
  });
});

test("dashboard next match still uses an earlier scheduled scrim", () => {
  const picked = pickDashboardNextMatch({
    upcomingEvents: [
      scheduleEvent({
        id: "scrim-1",
        title: "Scrim vs Wolves",
        kind: "scrim",
        start_at: "2026-05-29T17:00:00.000Z",
      }),
    ],
    tournamentMatchups: [
      tournamentMatchup({ startsAt: "2026-05-29T18:00:00.000Z" }),
    ],
  });

  assert.equal(picked?.source, "schedule");
  assert.equal(picked?.title, "Scrim vs Wolves");
  assert.equal(picked?.detailsHref, "/calendar");
});
