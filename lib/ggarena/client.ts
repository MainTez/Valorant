import "server-only";
import { unstable_cache } from "next/cache";
import {
  type GGArenaCompetition,
  type GGArenaDivision,
  type GGArenaEntity,
  type GGArenaLookupContext,
  type GGArenaMatchup,
  type GGArenaSignup,
  type GGArenaStandingRow,
  type GGArenaStatRow,
  isUpcomingMatchup,
  isValorantCompetition,
  matchesSurfBulls,
  normalizeClub,
  normalizeCompetition,
  normalizeDivision,
  normalizeMatchup,
  normalizeSignup,
  normalizeStandingRows,
  normalizeStatRows,
  normalizeTeamPlayerRows,
  sortMatchups,
  unwrapCollection,
} from "@/lib/ggarena/normalize";
import { selectTournamentDivisions } from "@/lib/ggarena/scope";

const BASE_URL = "https://www.ggarena.no/api/paradise/v2";
const DEFAULT_SURF_QUERY = "Surf'n Bulls";
const DEFAULT_VALORANT_GAME_ID = 20;

export type GGArenaSnapshotStatus =
  | "ready"
  | "missing-api-key"
  | "not-found"
  | "error";

export interface GGArenaSnapshot {
  status: GGArenaSnapshotStatus;
  message: string | null;
  updatedAt: string;
  club: GGArenaEntity | null;
  competitions: GGArenaCompetition[];
  divisions: GGArenaDivision[];
  signups: GGArenaSignup[];
  scoutingMatchups: GGArenaMatchup[];
  nextMatchups: GGArenaMatchup[];
  recentMatchups: GGArenaMatchup[];
  standings: GGArenaStandingRow[];
  stats: GGArenaStatRow[];
  warnings: string[];
}

class GGArenaApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export function ggarenaConfigured() {
  return Boolean(process.env.GGARENA_API_KEY);
}

export function surfBullsGGArenaContext(): GGArenaLookupContext {
  return {
    clubId: parseOptionalInt(process.env.GGARENA_SURF_CLUB_ID),
    teamId: parseOptionalInt(process.env.GGARENA_SURF_TEAM_ID),
    clubQuery: process.env.GGARENA_SURF_CLUB_QUERY?.trim() || DEFAULT_SURF_QUERY,
  };
}

export async function getSurfBullsArenaSnapshot(): Promise<GGArenaSnapshot> {
  const updatedAt = new Date().toISOString();
  if (!ggarenaConfigured()) {
    return {
      status: "missing-api-key",
      message: "GGarena token missing.",
      updatedAt,
      club: null,
      competitions: [],
      divisions: [],
      signups: [],
      scoutingMatchups: [],
      nextMatchups: [],
      recentMatchups: [],
      standings: [],
      stats: [],
      warnings: ["Set GGARENA_API_KEY in the runtime environment."],
    };
  }

  const context = surfBullsGGArenaContext();
  const warnings: string[] = [];

  try {
    const club = await resolveSurfBullsClub(context);
    let lookupContext: GGArenaLookupContext = {
      ...context,
      clubId: context.clubId ?? club?.id ?? null,
    };

    const bundle = await resolveCompetitionBundle(lookupContext, warnings);
    const surfSignup = findSurfSignup(bundle.signups, lookupContext);

    lookupContext = {
      ...lookupContext,
      clubId: lookupContext.clubId ?? surfSignup?.clubId ?? null,
      teamId: lookupContext.teamId ?? surfSignup?.teamId ?? null,
    };

    if (!club && !surfSignup && bundle.competitions.length === 0 && bundle.divisions.length === 0) {
      return {
        status: "not-found",
        message: "Surf'n Bulls was not found in GGarena.",
        updatedAt,
        club: null,
        competitions: [],
        divisions: [],
        signups: [],
        scoutingMatchups: [],
        nextMatchups: [],
        recentMatchups: [],
        standings: [],
        stats: [],
        warnings: [
          `No club, signup, or configured division matched "${context.clubQuery}". Set GGARENA_SURF_TEAM_ID, GGARENA_SURF_COMPETITION_IDS, or GGARENA_SURF_DIVISION_IDS if the GGarena name differs.`,
        ],
      };
    }

    const allTournamentDivisions = selectTournamentDivisions({
      configuredDivisionIds: [],
      divisions: bundle.divisions,
      signups: bundle.signups,
    });
    const configuredDivisionIds = parseIdList(process.env.GGARENA_SURF_DIVISION_IDS);
    const configuredDivisions = selectTournamentDivisions({
      configuredDivisionIds,
      divisions: bundle.divisions,
      signups: bundle.signups,
    });
    const targetDivisions =
      allTournamentDivisions.length > 0 ? allTournamentDivisions : configuredDivisions;
    const targetDivisionIds = uniqueNumbers(targetDivisions.map((division) => division.id));
    const targetCompetitionIds = uniqueNumbers([
      ...parseIdList(process.env.GGARENA_SURF_COMPETITION_IDS),
      ...bundle.signups.map((signup) => signup.competitionId),
      ...bundle.competitions.map((competition) => competition.id),
    ]);
    const targetCompetitions = bundle.competitions.filter((competition) =>
      targetCompetitionIds.includes(competition.id ?? -1),
    );

    const [matchupBundle, standings, stats] = await Promise.all([
      fetchSurfMatchups(targetDivisionIds, targetCompetitionIds, lookupContext, warnings),
      fetchStandings(targetDivisions, targetCompetitions, lookupContext),
      fetchStats(targetDivisions, targetCompetitions, lookupContext),
    ]);

    const enrichedStats = await hydrateStatsWithTeamRosters(stats, standings, warnings);
    const sorted = sortMatchups(matchupBundle.surfMatchups);
    const upcoming = sorted.filter((matchup) => isUpcomingMatchup(matchup));
    const recent = sorted
      .filter((matchup) => !isUpcomingMatchup(matchup))
      .reverse()
      .slice(0, 6);

    return {
      status: "ready",
      message: null,
      updatedAt,
      club: club ?? syntheticEntityFromSignup(surfSignup),
      competitions: bundle.competitions,
      divisions: bundle.divisions,
      signups: bundle.signups,
      scoutingMatchups: sortMatchups(matchupBundle.scoutingMatchups),
      nextMatchups: upcoming.slice(0, 6),
      recentMatchups: recent,
      standings: sortScopedRows(standings),
      stats: sortScopedRows(enrichedStats),
      warnings,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "GGarena request failed.",
      updatedAt,
      club: null,
      competitions: [],
      divisions: [],
      signups: [],
      scoutingMatchups: [],
      nextMatchups: [],
      recentMatchups: [],
      standings: [],
      stats: [],
      warnings,
    };
  }
}

export const getCachedSurfBullsArenaSnapshot = unstable_cache(
  getSurfBullsArenaSnapshot,
  ["surf-bulls-ggarena-snapshot-v2"],
  { revalidate: 60 },
);

async function hydrateStatsWithTeamRosters(
  stats: GGArenaStatRow[],
  standings: GGArenaStandingRow[],
  warnings: string[],
) {
  if (stats.length === 0 || standings.length === 0) return stats;

  const rosterTeams = uniqueStandingTeams(standings);
  if (rosterTeams.length === 0) return stats;

  let failedRosters = 0;
  const rosterEntries = (
    await mapWithConcurrency(rosterTeams, 8, async (team) => {
      try {
        const players = normalizeTeamPlayerRows(
          await ggarenaFetch(`/team/${team.id}/players`),
          team.id,
          team.name,
        );
        return players.map((player) => ({ player, team }));
      } catch {
        failedRosters += 1;
        return [];
      }
    })
  ).flat();

  if (failedRosters > 0) {
    warnings.push(
      `GGarena rosters could not be loaded for ${failedRosters} teams; some tournament stat groups may be incomplete.`,
    );
  }

  const scopedRoster = new Map<string, StandingTeamSeed>();
  const fallbackRoster = new Map<number, StandingTeamSeed[]>();

  for (const { player, team } of rosterEntries) {
    if (player.userId === null) continue;
    scopedRoster.set(`${team.scope}::${player.userId}`, team);
    const fallback = fallbackRoster.get(player.userId) ?? [];
    fallback.push(team);
    fallbackRoster.set(player.userId, fallback);
  }

  return stats.map((row) => {
    const playerId = row.playerId ?? row.id;
    if (playerId === null) return row;

    const scope = row.scope ?? "Tournament";
    const team =
      scopedRoster.get(`${scope}::${playerId}`) ??
      fallbackRoster.get(playerId)?.[0] ??
      null;
    if (!team) return row;

    return {
      ...row,
      teamId: team.id,
      teamName: team.name,
      isSurfBulls: row.isSurfBulls || team.isSurfBulls,
    };
  });
}

interface StandingTeamSeed {
  id: number;
  name: string;
  scope: string;
  isSurfBulls: boolean;
}

function uniqueStandingTeams(standings: GGArenaStandingRow[]) {
  const seen = new Set<string>();
  const teams: StandingTeamSeed[] = [];

  for (const row of standings) {
    if (row.id === null) continue;
    const scope = row.scope ?? "Tournament";
    const key = `${scope}::${row.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    teams.push({
      id: row.id,
      name: row.name,
      scope,
      isSurfBulls: row.isSurfBulls,
    });
  }

  return teams;
}

async function resolveSurfBullsClub(context: GGArenaLookupContext) {
  if (context.clubId) {
    return normalizeClub(await ggarenaFetch(`/club/${context.clubId}`));
  }

  const clubs = unwrapCollection(
    await ggarenaFetch("/club", { q: context.clubQuery, limit: 10 }),
  )
    .map(normalizeClub)
    .filter((club): club is GGArenaEntity => Boolean(club));

  return (
    clubs.find((club) => matchesSurfBulls(club.raw, context)) ??
    clubs.find((club) => matchesSurfBulls(club.name, context)) ??
    clubs[0] ??
    null
  );
}

async function resolveCompetitionBundle(
  context: GGArenaLookupContext,
  warnings: string[],
) {
  const configuredCompetitionIds = parseIdList(process.env.GGARENA_SURF_COMPETITION_IDS);
  const configuredDivisionIds = parseIdList(process.env.GGARENA_SURF_DIVISION_IDS);

  const candidates =
    configuredCompetitionIds.length > 0
      ? await fetchCompetitionsById(configuredCompetitionIds)
      : await fetchCompetitionCandidates();

  const bundles = await Promise.all(
    candidates.slice(0, configuredCompetitionIds.length > 0 ? candidates.length : 24).map(
      async (competition) => {
        const [signups, divisions] = await Promise.all([
          fetchCompetitionSignups(competition.id),
          fetchCompetitionDivisions(competition.id),
        ]);

        const matchedSignups = signups.filter((signup) => {
          return (
            matchesSurfBulls(signup.raw, context) ||
            (context.clubId ? signup.clubId === context.clubId : false) ||
            (context.teamId ? signup.teamId === context.teamId : false)
          );
        });

        return { competition, signups: matchedSignups, divisions };
      },
    ),
  );

  const relevantBundles = bundles.filter((bundle) => {
    return (
      configuredCompetitionIds.includes(bundle.competition.id ?? -1) ||
      bundle.signups.length > 0 ||
      matchesSurfBulls(bundle.competition.raw, context)
    );
  });

  if (relevantBundles.length === 0 && configuredDivisionIds.length === 0) {
    warnings.push(
      "No competition signup matched Surf'n Bulls. Add GGARENA_SURF_COMPETITION_IDS or GGARENA_SURF_DIVISION_IDS for a pinned feed.",
    );
  }

  const configuredDivisions =
    configuredDivisionIds.length > 0
      ? await fetchDivisionsById(configuredDivisionIds)
      : [];

  return {
    competitions: dedupeById(relevantBundles.map((bundle) => bundle.competition)),
    signups: dedupeById(relevantBundles.flatMap((bundle) => bundle.signups)),
    divisions: dedupeById([
      ...configuredDivisions,
      ...relevantBundles.flatMap((bundle) => bundle.divisions),
    ]),
  };
}

async function fetchCompetitionCandidates() {
  const valorantGameId =
    parseOptionalInt(process.env.GGARENA_VALORANT_GAME_ID) ?? DEFAULT_VALORANT_GAME_ID;
  const payload = await ggarenaFetch("/competition", {
    game_id: valorantGameId,
    limit: 150,
  });
  const competitions = unwrapCollection(payload)
    .map(normalizeCompetition)
    .filter((competition): competition is GGArenaCompetition => Boolean(competition));

  const valorant = competitions.filter(isValorantCompetition);
  return valorant.length > 0 ? valorant : competitions;
}

async function fetchCompetitionsById(ids: number[]) {
  const competitions = await Promise.all(
    ids.map(async (id) => normalizeCompetition(await ggarenaFetch(`/competition/${id}`))),
  );
  return competitions.filter(
    (competition): competition is GGArenaCompetition => Boolean(competition),
  );
}

async function fetchCompetitionSignups(competitionId: number | null) {
  if (!competitionId) return [];
  return unwrapCollection(await ggarenaFetch(`/competition/${competitionId}/signups`))
    .map(normalizeSignup)
    .filter((signup): signup is GGArenaSignup => Boolean(signup));
}

async function fetchCompetitionDivisions(competitionId: number | null) {
  if (!competitionId) return [];
  return unwrapCollection(await ggarenaFetch(`/competition/${competitionId}/divisions`))
    .map((payload): GGArenaDivision | null => {
      const division = normalizeDivision(payload);
      return division
        ? { ...division, competitionId: division.competitionId ?? competitionId }
        : null;
    })
    .filter((division): division is GGArenaDivision => Boolean(division));
}

async function fetchDivisionsById(ids: number[]) {
  const divisions = await Promise.all(
    ids.map(async (id) => normalizeDivision(await ggarenaFetch(`/division/${id}`))),
  );
  return divisions.filter((division): division is GGArenaDivision => Boolean(division));
}

async function fetchSurfMatchups(
  divisionIds: number[],
  competitionIds: number[],
  context: GGArenaLookupContext,
  warnings: string[],
) {
  const divisionMatchups = (
    await Promise.all(
      divisionIds.map(async (divisionId) => {
        return unwrapCollection(await ggarenaFetch(`/division/${divisionId}/matchups`));
      }),
    )
  ).flat();

  const competitionMatchups =
    divisionMatchups.length === 0
      ? (
          await Promise.all(
            competitionIds.map(async (competitionId) => {
              return unwrapCollection(
                await ggarenaFetch("/matchup", {
                  competition_id: competitionId,
                  limit: 100,
                }),
              );
            }),
          )
        ).flat()
      : [];

  const normalized = [...divisionMatchups, ...competitionMatchups]
    .map((matchup) => normalizeMatchup(matchup, context))
    .filter((matchup): matchup is GGArenaMatchup => Boolean(matchup));

  const surfMatchups = normalized.filter((matchup) => matchup.includesSurfBulls);
  if (normalized.length > 0 && surfMatchups.length === 0) {
    warnings.push(
      "GGarena returned matchups, but none could be matched to Surf'n Bulls by ID or name.",
    );
  }

  return {
    scoutingMatchups: normalized,
    surfMatchups: await enrichMatchupDetails(surfMatchups, context, warnings),
  };
}

async function enrichMatchupDetails(
  matchups: GGArenaMatchup[],
  context: GGArenaLookupContext,
  warnings: string[],
) {
  return Promise.all(
    matchups.map(async (matchup) => {
      if (!matchup.id) return matchup;
      try {
        const detailed = normalizeMatchup(await ggarenaFetch(`/matchup/${matchup.id}`), context);
        return detailed?.includesSurfBulls ? detailed : matchup;
      } catch {
        warnings.push(
          `GGarena matchup ${matchup.id} details could not be loaded; score result may be missing.`,
        );
        return matchup;
      }
    }),
  );
}

async function fetchStandings(
  divisions: GGArenaDivision[],
  competitions: GGArenaCompetition[],
  context: GGArenaLookupContext,
) {
  const payloads = await Promise.all(
    divisions.length > 0
      ? divisions.map(async (division) => ({
          scope: division.name,
          payload: await ggarenaFetch(`/division/${division.id}/tables`),
        }))
      : competitions.map(async (competition) => ({
          scope: competition.name,
          payload: await ggarenaFetch(`/competition/${competition.id}/tables`),
        })),
  );

  return payloads.flatMap(({ scope, payload }) => normalizeStandingRows(payload, context, scope));
}

async function fetchStats(
  divisions: GGArenaDivision[],
  competitions: GGArenaCompetition[],
  context: GGArenaLookupContext,
) {
  const payloads = await Promise.all(
    divisions.length > 0
      ? divisions.map(async (division) => ({
          scope: division.name,
          payload: await ggarenaFetch(`/division/${division.id}/stats`),
        }))
      : competitions.map(async (competition) => ({
          scope: competition.name,
          payload: await ggarenaFetch(`/competition/${competition.id}/stats`),
        })),
  );

  return payloads.flatMap(({ scope, payload }) => normalizeStatRows(payload, scope, context));
}

async function ggarenaFetch(path: string, params?: Record<string, string | number>) {
  const token = process.env.GGARENA_API_KEY;
  if (!token) throw new GGArenaApiError("GGarena token missing.", 401);

  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      let body: unknown = await response.text().catch(() => "");
      try {
        body = JSON.parse(body as string);
      } catch {
        // keep text
      }
      throw new GGArenaApiError(`GGarena API ${response.status}`, response.status, body);
    }

    return response.json() as Promise<unknown>;
  } finally {
    clearTimeout(timeout);
  }
}

function parseOptionalInt(value: string | undefined) {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseIdList(value: string | undefined) {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((id) => Number.isInteger(id));
}

function uniqueNumbers(values: Array<number | null>) {
  return [...new Set(values.filter((value): value is number => Number.isInteger(value)))];
}

function dedupeById<T extends { id: number | null; name: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.id === null ? `name:${item.name}` : `id:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
) {
  const results: R[] = [];
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await mapper(items[index], index);
      }
    },
  );

  await Promise.all(workers);
  return results;
}

function findSurfSignup(signups: GGArenaSignup[], context: GGArenaLookupContext) {
  return signups.find((signup) => {
    return (
      matchesSurfBulls(signup.raw, context) ||
      matchesSurfBulls(signup.name, context) ||
      (context.clubId ? signup.clubId === context.clubId : false) ||
      (context.teamId ? signup.teamId === context.teamId : false)
    );
  }) ?? null;
}

function syntheticEntityFromSignup(signup: GGArenaSignup | null): GGArenaEntity | null {
  if (!signup) return null;
  return {
    id: signup.teamId ?? signup.clubId ?? signup.id,
    uuid: signup.uuid,
    name: signup.teamName ?? signup.clubName ?? signup.name,
    status: signup.status,
    raw: signup.raw,
  };
}

function sortScopedRows<T extends { scope: string | null; rank?: number | null; name: string }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const scope = (a.scope ?? "").localeCompare(b.scope ?? "", undefined, { numeric: true });
    if (scope !== 0) return scope;
    if (a.rank != null || b.rank != null) {
      return (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER);
    }
    return a.name.localeCompare(b.name);
  });
}
