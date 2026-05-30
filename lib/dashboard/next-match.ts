import type { GGArenaMatchup } from "@/lib/ggarena/normalize";
import type { ScheduleEventRow } from "@/types/domain";
import { tournamentMatchupHref } from "../ggarena/matchup-links.ts";

export type DashboardNextMatchSource = "schedule" | "ggarena";

export interface DashboardNextMatch {
  id: string;
  title: string;
  opponentLogoUrl: string | null;
  kind: string;
  startAt: string | null;
  location: string | null;
  detailsHref: string;
  detailsLabel: string;
  source: DashboardNextMatchSource;
}

export function buildDashboardNextMatches({
  upcomingEvents,
  tournamentMatchups,
}: {
  upcomingEvents: ScheduleEventRow[];
  tournamentMatchups: GGArenaMatchup[];
}): DashboardNextMatch[] {
  const scheduledMatches = upcomingEvents
    .filter((event) => event.kind === "match" || event.kind === "scrim")
    .map(scheduleEventToDashboardMatch);
  const tournamentMatches = tournamentMatchups.map(tournamentMatchupToDashboardMatch);

  return sortDashboardMatches([...scheduledMatches, ...tournamentMatches]);
}

export function pickDashboardNextMatch({
  upcomingEvents,
  tournamentMatchups,
}: {
  upcomingEvents: ScheduleEventRow[];
  tournamentMatchups: GGArenaMatchup[];
}): DashboardNextMatch | null {
  const matchCandidates = buildDashboardNextMatches({
    upcomingEvents,
    tournamentMatchups,
  });

  if (matchCandidates.length > 0) return matchCandidates[0];

  const fallbackEvent = sortDashboardMatches(upcomingEvents.map(scheduleEventToDashboardMatch))[0];
  return fallbackEvent ?? null;
}

function scheduleEventToDashboardMatch(event: ScheduleEventRow): DashboardNextMatch {
  return {
    id: `schedule-${event.id}`,
    title: event.title,
    opponentLogoUrl: null,
    kind: event.kind,
    startAt: event.start_at,
    location: event.location,
    detailsHref: "/calendar",
    detailsLabel: "View match details →",
    source: "schedule",
  };
}

function tournamentMatchupToDashboardMatch(matchup: GGArenaMatchup): DashboardNextMatch {
  const opponent = matchup.sides.find((side) => !side.isSurfBulls) ?? null;

  return {
    id: `ggarena-matchup-${matchup.id ?? matchup.uuid ?? matchup.name}`,
    title: opponent?.name ?? matchup.opponentName ?? matchup.name ?? "Opponent TBD",
    opponentLogoUrl: opponent?.logoUrl ?? null,
    kind: "tournament",
    startAt: matchup.startsAt,
    location:
      [matchup.divisionName, matchup.roundName].filter(Boolean).join(" · ") ||
      matchup.competitionName ||
      "GGarena",
    detailsHref: tournamentMatchupHref(matchup),
    detailsLabel: "View tournament →",
    source: "ggarena",
  };
}

function sortDashboardMatches(matches: DashboardNextMatch[]) {
  return [...matches].sort((a, b) => timestampFor(a) - timestampFor(b));
}

function timestampFor(match: DashboardNextMatch) {
  if (!match.startAt) return Number.MAX_SAFE_INTEGER;
  const timestamp = new Date(match.startAt).getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}
