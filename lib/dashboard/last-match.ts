import type { GGArenaMatchup } from "@/lib/ggarena/normalize";
import type { MatchRow, Result } from "@/types/domain";

export interface DashboardLastMatchResult {
  id: string;
  source: "local" | "ggarena";
  result: Result;
  scoreline: string;
  opponent: string;
  detail: string;
  playedAt: string | null;
}

interface DashboardLastMatchInput {
  localMatches: MatchRow[];
  tournamentMatchups: GGArenaMatchup[];
}

export function buildDashboardLastMatchResult(input: DashboardLastMatchInput) {
  return buildDashboardRecentResults(input)[0] ?? null;
}

export function buildDashboardRecentResults({
  localMatches,
  tournamentMatchups,
}: DashboardLastMatchInput): DashboardLastMatchResult[] {
  return [
    ...tournamentMatchups.flatMap(tournamentMatchToResult),
    ...localMatches.map(localMatchToResult),
  ]
    .sort((a, b) => resultTime(b) - resultTime(a))
    .slice(0, 10);
}

function tournamentMatchToResult(matchup: GGArenaMatchup): DashboardLastMatchResult[] {
  if (!matchup.surfResult || !matchup.scoreline) return [];

  return [
    {
      id: `ggarena-matchup-${matchup.id ?? matchup.uuid ?? matchup.name}`,
      source: "ggarena",
      result: matchup.surfResult,
      scoreline: matchup.scoreline,
      opponent: matchup.opponentName ?? matchup.name,
      detail:
        [matchup.divisionName, matchup.roundName].filter(Boolean).join(" · ") ||
        matchup.competitionName ||
        "GGarena",
      playedAt: matchup.startsAt,
    },
  ];
}

function localMatchToResult(match: MatchRow): DashboardLastMatchResult {
  return {
    id: `local-match-${match.id}`,
    source: "local",
    result: match.result,
    scoreline: `${match.score_us} - ${match.score_them}`,
    opponent: match.opponent,
    detail: match.map,
    playedAt: match.date,
  };
}

function resultTime(result: DashboardLastMatchResult) {
  if (!result.playedAt) return 0;
  const parsed = new Date(result.playedAt).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}
