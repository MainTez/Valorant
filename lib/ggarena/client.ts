import "server-only";
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
  sortMatchups,
  unwrapCollection,
} from "@/lib/ggarena/normalize";

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
        nextMatchups: [],
        recentMatchups: [],
        standings: [],
        stats: [],
        warnings: [
          `No club, signup, or configured division matched "${context.clubQuery}". Set GGARENA_SURF_TEAM_ID, GGARENA_SURF_COMPETITION_IDS, or GGARENA_SURF_DIVISION_IDS if the GGarena name differs.`,
        ],
      };
    }

    const targetDivisionIds = uniqueNumbers([
      ...parseIdList(process.env.GGARENA_SURF_DIVISION_IDS),
      ...bundle.signups.map((signup) => signup.divisionId),
      ...bundle.divisions.map((division) => division.id),
    ]);
    const targetCompetitionIds = uniqueNumbers([
      ...parseIdList(process.env.GGARENA_SURF_COMPETITION_IDS),
      ...bundle.signups.map((signup) => signup.competitionId),
      ...bundle.competitions.map((competition) => competition.id),
    ]);

    const [matchups, standings, stats] = await Promise.all([
      fetchSurfMatchups(targetDivisionIds, targetCompetitionIds, lookupContext, warnings),
      fetchStandings(targetDivisionIds, targetCompetitionIds, lookupContext),
      fetchStats(targetDivisionIds, targetCompetitionIds, lookupContext),
    ]);

    const sorted = sortMatchups(matchups);
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
      nextMatchups: upcoming.slice(0, 6),
      recentMatchups: recent,
      standings: prioritizeSurfRows(standings, lookupContext).slice(0, 18),
      stats: prioritizeSurfRows(stats, lookupContext).slice(0, 18),
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
      nextMatchups: [],
      recentMatchups: [],
      standings: [],
      stats: [],
      warnings,
    };
  }
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
      ...relevantBundles.flatMap((bundle) => {
        const signupDivisionIds = new Set(
          bundle.signups.map((signup) => signup.divisionId).filter(Boolean),
        );
        if (signupDivisionIds.size === 0) return bundle.divisions;
        return bundle.divisions.filter((division) => signupDivisionIds.has(division.id));
      }),
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

  return surfMatchups;
}

async function fetchStandings(
  divisionIds: number[],
  competitionIds: number[],
  context: GGArenaLookupContext,
) {
  const payloads = await Promise.all([
    ...divisionIds.map((id) => ggarenaFetch(`/division/${id}/tables`)),
    ...competitionIds.map((id) => ggarenaFetch(`/competition/${id}/tables`)),
  ]);

  return payloads.flatMap((payload) => normalizeStandingRows(payload, context));
}

async function fetchStats(
  divisionIds: number[],
  competitionIds: number[],
  context: GGArenaLookupContext,
) {
  const payloads = await Promise.all([
    ...divisionIds.map(async (id) => ({
      scope: `Division ${id}`,
      payload: await ggarenaFetch(`/division/${id}/stats`),
    })),
    ...competitionIds.map(async (id) => ({
      scope: `Competition ${id}`,
      payload: await ggarenaFetch(`/competition/${id}/stats`),
    })),
  ]);

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

function prioritizeSurfRows<T extends { isSurfBulls: boolean; name: string }>(
  rows: T[],
  context: GGArenaLookupContext,
) {
  return [...rows].sort((a, b) => {
    const aSurf = a.isSurfBulls || matchesSurfBulls(a.name, context);
    const bSurf = b.isSurfBulls || matchesSurfBulls(b.name, context);
    if (aSurf !== bSurf) return aSurf ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
