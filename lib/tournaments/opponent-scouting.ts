import type {
  GGArenaMatchup,
  GGArenaMatchupResult,
  GGArenaMatchupSide,
  GGArenaStandingRow,
  GGArenaStatMetric,
  GGArenaStatRow,
} from "../ggarena/normalize.ts";
import { matchupLookupKey } from "../ggarena/matchup-links.ts";
import {
  findTournamentStatTeamForStanding,
  groupTournamentStatsByTeam,
} from "../ggarena/tournament-stats.ts";
import type { TournamentMatchPrepEventInput } from "./match-prep.ts";

export interface TournamentOpponentScoutRecentResult {
  key: string;
  opponentName: string;
  otherTeamName: string;
  result: GGArenaMatchupResult | null;
  scoreline: string | null;
  playedAt: string | null;
  roundName: string | null;
  divisionName: string | null;
}

export interface TournamentOpponentScoutNote {
  key: string;
  matchupName: string;
  opponentName: string;
  notes: string;
  updatedAt: string;
  playedAt: string | null;
}

export interface TournamentOpponentScoutPlayer {
  key: string;
  name: string;
  metrics: GGArenaStatMetric[];
}

export interface TournamentOpponentScoutSummary {
  opponentName: string;
  standing: GGArenaStandingRow | null;
  recentResults: TournamentOpponentScoutRecentResult[];
  roster: TournamentOpponentScoutPlayer[];
  previousNotes: TournamentOpponentScoutNote[];
}

export function buildTournamentOpponentScout({
  matchup,
  noteMatchups,
  prepNoteEvents,
  scoutingMatchups,
  standings,
  stats,
}: {
  matchup: GGArenaMatchup;
  noteMatchups?: GGArenaMatchup[];
  prepNoteEvents?: TournamentMatchPrepEventInput[];
  scoutingMatchups?: GGArenaMatchup[];
  standings: GGArenaStandingRow[];
  stats: GGArenaStatRow[];
}): TournamentOpponentScoutSummary {
  const opponentSide = matchup.sides.find((side) => !side.isSurfBulls) ?? null;
  const opponentName = opponentSide?.name ?? matchup.opponentName ?? matchup.name;
  const standing = findStandingForOpponent(standings, matchup, opponentName);
  const identity = buildTeamIdentity(opponentName, opponentSide, standing);
  const currentKey = matchupLookupKey(matchup);
  const matchupsForResults = scoutingMatchups?.length
    ? scoutingMatchups
    : noteMatchups?.length
      ? noteMatchups
      : [matchup];
  const matchupsForNotes = uniqueMatchups([
    ...(noteMatchups ?? []),
    ...(scoutingMatchups ?? []),
    matchup,
  ]);

  return {
    opponentName,
    standing,
    recentResults: buildRecentResults({
      currentKey,
      identity,
      matchups: matchupsForResults,
    }),
    roster: buildRoster({ identity, standing, standings, stats }),
    previousNotes: buildPreviousNotes({
      currentKey,
      identity,
      matchups: matchupsForNotes,
      events: prepNoteEvents ?? [],
    }),
  };
}

function buildRecentResults({
  currentKey,
  identity,
  matchups,
}: {
  currentKey: string;
  identity: TeamIdentity;
  matchups: GGArenaMatchup[];
}) {
  return matchups
    .flatMap((matchup): TournamentOpponentScoutRecentResult[] => {
      const key = matchupLookupKey(matchup);
      if (key === currentKey) return [];
      const opponentSide = findSideForIdentity(matchup, identity);
      if (!opponentSide) return [];
      const otherSide = matchup.sides.find((side) => side !== opponentSide) ?? null;
      const result = resolveResultForSide(matchup, opponentSide, otherSide);
      if (!result.result && !result.scoreline) return [];

      return [
        {
          key,
          opponentName: opponentSide.name,
          otherTeamName: otherSide?.name ?? matchup.opponentName ?? "Opponent",
          result: result.result,
          scoreline: result.scoreline,
          playedAt: matchup.startsAt,
          roundName: matchup.roundName,
          divisionName: matchup.divisionName ?? matchup.competitionName,
        },
      ];
    })
    .sort((a, b) => timestamp(b.playedAt) - timestamp(a.playedAt))
    .slice(0, 5);
}

function buildRoster({
  identity,
  standing,
  standings,
  stats,
}: {
  identity: TeamIdentity;
  standing: GGArenaStandingRow | null;
  standings: GGArenaStandingRow[];
  stats: GGArenaStatRow[];
}): TournamentOpponentScoutPlayer[] {
  const groups = groupTournamentStatsByTeam(stats, standings);
  const teams = groups.flatMap((group) => group.teams);
  const team =
    (standing ? findTournamentStatTeamForStanding(standing, groups) : null) ??
    teams.find((candidate) => {
      if (candidate.id !== null && identity.ids.has(candidate.id)) return true;
      return identity.names.has(normalizeName(candidate.name));
    }) ??
    null;

  if (!team) return [];

  return [...team.players]
    .sort((a, b) => {
      return (
        metricValue(b, ["kills", "kill", "k"]) - metricValue(a, ["kills", "kill", "k"]) ||
        metricValue(a, ["deaths", "death", "d"]) - metricValue(b, ["deaths", "death", "d"]) ||
        displayPlayerName(a).localeCompare(displayPlayerName(b))
      );
    })
    .slice(0, 8)
    .map((row) => ({
      key: `${row.scope ?? "Tournament"}:${row.teamId ?? row.teamName ?? "team"}:${row.playerId ?? row.name}`,
      name: displayPlayerName(row),
      metrics: pickScoutMetrics(row),
    }));
}

function buildPreviousNotes({
  currentKey,
  events,
  identity,
  matchups,
}: {
  currentKey: string;
  events: TournamentMatchPrepEventInput[];
  identity: TeamIdentity;
  matchups: GGArenaMatchup[];
}) {
  const matchupsByKey = new Map(matchups.map((matchup) => [matchupLookupKey(matchup), matchup]));
  const latestByMatchup = new Map<string, TournamentOpponentScoutNote>();

  for (const event of [...events].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    if (event.verb !== "tournament_prep_notes_updated") continue;
    const key = event.object_id;
    if (!key || key === currentKey || latestByMatchup.has(key)) continue;

    const notes = readString(event.payload, "notes")?.trim();
    if (!notes) continue;

    const noteMatchup = matchupsByKey.get(key) ?? null;
    const payloadOpponentName = readString(event.payload, "opponent_name");
    const matchesOpponent =
      (noteMatchup ? Boolean(findSideForIdentity(noteMatchup, identity)) : false) ||
      (payloadOpponentName ? identity.names.has(normalizeName(payloadOpponentName)) : false);
    if (!matchesOpponent) continue;

    latestByMatchup.set(key, {
      key,
      matchupName: noteMatchup?.name ?? payloadOpponentName ?? "Previous match",
      opponentName:
        payloadOpponentName ??
        findSideForIdentity(noteMatchup, identity)?.name ??
        "Opponent",
      notes,
      updatedAt: event.created_at,
      playedAt: noteMatchup?.startsAt ?? readString(event.payload, "matchup_starts_at"),
    });
  }

  return Array.from(latestByMatchup.values()).slice(0, 4);
}

function findStandingForOpponent(
  standings: GGArenaStandingRow[],
  matchup: GGArenaMatchup,
  opponentName: string,
) {
  const opponentSide = matchup.sides.find((side) => !side.isSurfBulls) ?? null;
  const candidateIds = new Set(
    [opponentSide?.teamId, opponentSide?.clubId, opponentSide?.id].filter(
      (id): id is number => typeof id === "number",
    ),
  );
  const normalizedOpponent = normalizeName(opponentName);

  return (
    standings.find((row) => row.id !== null && candidateIds.has(row.id)) ??
    standings.find((row) => normalizeName(row.name) === normalizedOpponent) ??
    null
  );
}

interface TeamIdentity {
  ids: Set<number>;
  names: Set<string>;
}

function buildTeamIdentity(
  opponentName: string,
  opponentSide: GGArenaMatchupSide | null,
  standing: GGArenaStandingRow | null,
): TeamIdentity {
  const ids = new Set(
    [
      opponentSide?.id,
      opponentSide?.teamId,
      opponentSide?.clubId,
      standing?.id,
    ].filter((id): id is number => typeof id === "number"),
  );
  const names = new Set(
    [opponentName, opponentSide?.name, standing?.name]
      .filter((name): name is string => typeof name === "string" && name.trim().length > 0)
      .map(normalizeName),
  );
  return { ids, names };
}

function findSideForIdentity(matchup: GGArenaMatchup | null, identity: TeamIdentity) {
  if (!matchup) return null;
  return (
    matchup.sides.find((side) => {
      if (side.id !== null && identity.ids.has(side.id)) return true;
      if (side.teamId !== null && identity.ids.has(side.teamId)) return true;
      if (side.clubId !== null && identity.ids.has(side.clubId)) return true;
      return identity.names.has(normalizeName(side.name));
    }) ?? null
  );
}

function resolveResultForSide(
  matchup: GGArenaMatchup,
  side: GGArenaMatchupSide,
  otherSide: GGArenaMatchupSide | null,
): { result: GGArenaMatchupResult | null; scoreline: string | null } {
  if (otherSide && side.score !== null && otherSide.score !== null) {
    return {
      result:
        side.score === otherSide.score
          ? "draw"
          : side.score > otherSide.score
            ? "win"
            : "loss",
      scoreline: `${side.score}-${otherSide.score}`,
    };
  }

  if (!side.isSurfBulls && matchup.surfResult) {
    return {
      result: invertResult(matchup.surfResult),
      scoreline: invertScoreline(matchup.scoreline),
    };
  }

  if (side.isSurfBulls && matchup.surfResult) {
    return {
      result: matchup.surfResult,
      scoreline: matchup.scoreline,
    };
  }

  return { result: null, scoreline: null };
}

function invertResult(result: GGArenaMatchupResult): GGArenaMatchupResult {
  if (result === "win") return "loss";
  if (result === "loss") return "win";
  return "draw";
}

function invertScoreline(scoreline: string | null) {
  if (!scoreline) return null;
  const [left, right] = scoreline.split("-");
  return left && right ? `${right}-${left}` : scoreline;
}

function uniqueMatchups(matchups: GGArenaMatchup[]) {
  const seen = new Set<string>();
  return matchups.filter((matchup) => {
    const key = matchupLookupKey(matchup);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pickScoutMetrics(row: GGArenaStatRow) {
  const picked = [
    findMetric(row, ["kills", "kill", "k"]),
    findMetric(row, ["deaths", "death", "d"]),
    findMetric(row, ["assists", "assist", "a"]),
    findMetric(row, ["combat score", "average combat score", "acs"]),
    findMetric(row, ["headshot percentage", "headshot pct", "hs percentage", "hs pct", "hs"]),
  ].filter((metric): metric is GGArenaStatMetric => Boolean(metric));

  return picked.length > 0 ? picked.slice(0, 3) : row.metrics.slice(0, 3);
}

function findMetric(row: GGArenaStatRow, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeMetricName);
  return (
    row.metrics.find((item) => {
      const key = normalizeMetricName(item.key);
      const label = normalizeMetricName(item.label);
      return normalizedAliases.some((alias) => alias === key || alias === label);
    }) ?? null
  );
}

function metricValue(row: GGArenaStatRow, aliases: string[]) {
  return findMetric(row, aliases)?.value ?? 0;
}

function displayPlayerName(row: GGArenaStatRow) {
  if (row.playerName) return row.playerName;
  if (row.teamName && row.teamName === row.name) return "Team total";
  return row.name;
}

function readString(payload: Record<string, unknown> | null, key: string) {
  const value = payload?.[key];
  return typeof value === "string" ? value : null;
}

function timestamp(value: string | null) {
  return value ? new Date(value).getTime() || 0 : 0;
}

function normalizeMetricName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
