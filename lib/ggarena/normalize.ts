export type RawRecord = Record<string, unknown>;

export interface GGArenaLookupContext {
  clubId: number | null;
  teamId: number | null;
  clubQuery: string;
}

export interface GGArenaEntity {
  id: number | null;
  uuid: string | null;
  name: string;
  status: string | null;
  raw: RawRecord;
}

export interface GGArenaCompetition extends GGArenaEntity {
  game: string | null;
}

export interface GGArenaDivision extends GGArenaEntity {
  competitionId: number | null;
}

export interface GGArenaSignup extends GGArenaEntity {
  clubId: number | null;
  teamId: number | null;
  divisionId: number | null;
  competitionId: number | null;
  clubName: string | null;
  teamName: string | null;
}

export interface GGArenaMatchupSide {
  id: number | null;
  clubId: number | null;
  teamId: number | null;
  name: string;
  score: number | null;
  isSurfBulls: boolean;
}

export interface GGArenaMatchup extends GGArenaEntity {
  competitionId: number | null;
  competitionName: string | null;
  divisionId: number | null;
  divisionName: string | null;
  roundName: string | null;
  startsAt: string | null;
  sides: GGArenaMatchupSide[];
  opponentName: string | null;
  includesSurfBulls: boolean;
}

export interface GGArenaStandingRow {
  id: number | null;
  name: string;
  played: number | null;
  wins: number | null;
  draws: number | null;
  losses: number | null;
  points: number | null;
  rank: number | null;
  isSurfBulls: boolean;
}

export interface GGArenaStatMetric {
  key: string;
  label: string;
  value: number;
}

export interface GGArenaStatRow {
  id: number | null;
  name: string;
  scope: string | null;
  isSurfBulls: boolean;
  metrics: GGArenaStatMetric[];
}

const COLLECTION_KEYS = [
  "data",
  "items",
  "results",
  "clubs",
  "teams",
  "members",
  "competitions",
  "divisions",
  "signups",
  "matchups",
  "matches",
  "tables",
  "standings",
  "rows",
  "stats",
  "players",
];

const SIDE_ARRAY_KEYS = [
  "sides",
  "teams",
  "participants",
  "opponents",
  "signups",
  "matchup_sides",
  "matchupSides",
  "lineup",
];

const SIDE_PAIR_KEYS: Array<[string, string]> = [
  ["home", "away"],
  ["home_team", "away_team"],
  ["homeTeam", "awayTeam"],
  ["team1", "team2"],
  ["team_1", "team_2"],
  ["teamA", "teamB"],
  ["team_a", "team_b"],
  ["opponent1", "opponent2"],
  ["opponent_1", "opponent_2"],
];

const NAME_KEYS = [
  "name",
  "title",
  "display_name",
  "displayName",
  "team_name",
  "teamName",
  "club_name",
  "clubName",
  "signup_name",
  "signupName",
  "username",
  "riot_id",
  "riotId",
];

const DATE_KEYS = [
  "starts_at",
  "startsAt",
  "start_at",
  "startAt",
  "scheduled_at",
  "scheduledAt",
  "match_at",
  "matchAt",
  "date",
  "time",
  "deadline_at",
  "deadlineAt",
];

export function isRecord(value: unknown): value is RawRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function unwrapCollection(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];

  for (const key of COLLECTION_KEYS) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
    if (isRecord(value)) {
      const nested = unwrapCollection(value);
      if (nested.length > 0) return nested;
    }
  }

  return [];
}

export function unwrapObject(payload: unknown): RawRecord | null {
  if (!isRecord(payload)) return null;
  if (isRecord(payload.data)) return payload.data;
  return payload;
}

export function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function matchesSurfBulls(value: unknown, context?: Partial<GGArenaLookupContext>) {
  if (isRecord(value)) {
    const id = readNumber(value, ["id", "club_id", "clubId"]);
    const teamId = readNumber(value, ["team_id", "teamId"]);
    if (context?.clubId && id === context.clubId) return true;
    if (context?.clubId && readNestedId(value, ["club"]) === context.clubId) return true;
    if (context?.teamId && (id === context.teamId || teamId === context.teamId)) return true;
    if (context?.teamId && readNestedId(value, ["team"]) === context.teamId) return true;
  }

  const tokens = collectStrings(value).map(normalizeText).filter(Boolean);
  const clubQuery = normalizeText(context?.clubQuery ?? "Surf'n Bulls");
  return tokens.some((token) => {
    return (
      token.includes("surfnbulls") ||
      token.includes("surfandbulls") ||
      token.includes(clubQuery) ||
      (token.includes("surf") && token.includes("bull"))
    );
  });
}

export function normalizeClub(payload: unknown): GGArenaEntity | null {
  const record = unwrapObject(payload);
  return record ? normalizeEntity(record, "Unknown club") : null;
}

export function normalizeCompetition(payload: unknown): GGArenaCompetition | null {
  const record = unwrapObject(payload);
  if (!record) return null;

  return {
    ...normalizeEntity(record, "Untitled competition"),
    game:
      readString(record, ["game", "game_name", "gameName", "game_slug", "gameSlug"]) ??
      readStringFromNested(record, ["game"], NAME_KEYS) ??
      readStringFromNested(record, ["game"], ["acronym", "slug"]) ??
      null,
  };
}

export function normalizeDivision(payload: unknown): GGArenaDivision | null {
  const record = unwrapObject(payload);
  if (!record) return null;

  return {
    ...normalizeEntity(record, "Unnamed division"),
    competitionId:
      readNumber(record, ["competition_id", "competitionId"]) ??
      readNestedId(record, ["competition"]) ??
      null,
  };
}

export function normalizeSignup(payload: unknown): GGArenaSignup | null {
  const record = unwrapObject(payload);
  if (!record) return null;

  const entity = normalizeEntity(record, "Unnamed signup");
  const teamName = readStringFromNested(record, ["team"], NAME_KEYS);
  const clubName = readStringFromNested(record, ["club"], NAME_KEYS);

  return {
    ...entity,
    name: teamName ?? entity.name ?? clubName ?? "Unnamed signup",
    clubId:
      readNumber(record, ["club_id", "clubId"]) ??
      readNestedId(record, ["club"]) ??
      null,
    teamId:
      readNumber(record, ["team_id", "teamId"]) ??
      readNestedId(record, ["team"]) ??
      null,
    divisionId:
      readNumber(record, ["division_id", "divisionId"]) ??
      readNestedId(record, ["division"]) ??
      null,
    competitionId:
      readNumber(record, ["competition_id", "competitionId"]) ??
      readNestedId(record, ["competition"]) ??
      null,
    clubName,
    teamName,
  };
}

export function normalizeMatchup(
  payload: unknown,
  context?: Partial<GGArenaLookupContext>,
): GGArenaMatchup | null {
  const record = unwrapObject(payload);
  if (!record) return null;

  const entity = normalizeEntity(record, "Matchup");
  const sides = extractSides(record, context);
  const includesSurfBulls =
    sides.some((side) => side.isSurfBulls) || matchesSurfBulls(record, context);
  const opponentName =
    sides.find((side) => !side.isSurfBulls)?.name ??
    sides.find((side) => side.name)?.name ??
    null;
  const label =
    sides.length >= 2
      ? sides.map((side) => side.name).join(" vs ")
      : entity.name;

  return {
    ...entity,
    name: label,
    competitionId:
      readNumber(record, ["competition_id", "competitionId"]) ??
      readNestedId(record, ["competition"]) ??
      null,
    competitionName: readStringFromNested(record, ["competition"], NAME_KEYS),
    divisionId:
      readNumber(record, ["division_id", "divisionId"]) ??
      readNestedId(record, ["division"]) ??
      null,
    divisionName: readStringFromNested(record, ["division"], NAME_KEYS),
    roundName:
      readString(record, ["round", "round_name", "roundName"]) ??
      readStringFromNested(record, ["round"], NAME_KEYS),
    startsAt: readDate(record),
    sides,
    opponentName,
    includesSurfBulls,
  };
}

export function normalizeStandingRows(
  payload: unknown,
  context?: Partial<GGArenaLookupContext>,
): GGArenaStandingRow[] {
  return extractTabularRows(payload).map((record, index) => {
    const name =
      readStringFromNested(record, ["team", "signup", "club", "user"], NAME_KEYS) ??
      readString(record, NAME_KEYS) ??
      `Row ${index + 1}`;

    return {
      id: readNumber(record, ["id", "team_id", "teamId", "signup_id", "signupId"]),
      name,
      played: readNumber(record, ["played", "matches_played", "matchesPlayed", "mp", "matches"]),
      wins: readNumber(record, ["wins", "won", "w"]),
      draws: readNumber(record, ["draws", "draw", "d"]),
      losses: readNumber(record, ["losses", "lost", "l"]),
      points: readNumber(record, ["points", "pts", "score"]),
      rank: readNumber(record, ["rank", "place", "position"]),
      isSurfBulls: matchesSurfBulls(record, context),
    };
  });
}

export function normalizeStatRows(
  payload: unknown,
  scope: string | null,
  context?: Partial<GGArenaLookupContext>,
): GGArenaStatRow[] {
  return extractTabularRows(payload)
    .map((record, index) => {
      const name =
        readStringFromNested(record, ["user", "player", "team", "signup", "club"], NAME_KEYS) ??
        readString(record, NAME_KEYS) ??
        `Entry ${index + 1}`;

      return {
        id: readNumber(record, ["id", "user_id", "userId", "team_id", "teamId"]),
        name,
        scope,
        isSurfBulls: matchesSurfBulls(record, context),
        metrics: numericMetrics(record).slice(0, 5),
      };
    })
    .filter((row) => row.metrics.length > 0);
}

export function isUpcomingMatchup(matchup: GGArenaMatchup, now = Date.now()) {
  const status = normalizeText(matchup.status ?? "");
  if (["finished", "completed", "done", "played", "closed", "reported"].some((s) => status.includes(s))) {
    return false;
  }

  if (!matchup.startsAt) return true;
  return new Date(matchup.startsAt).getTime() >= now - 60 * 60 * 1000;
}

export function sortMatchups(matchups: GGArenaMatchup[]) {
  return [...matchups].sort((a, b) => {
    const aTime = a.startsAt ? new Date(a.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.startsAt ? new Date(b.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
}

export function isValorantCompetition(competition: GGArenaCompetition) {
  const haystack = collectStrings(competition.raw).join(" ");
  return /valorant|val\b/i.test(haystack);
}

function normalizeEntity(record: RawRecord, fallbackName: string): GGArenaEntity {
  return {
    id: readNumber(record, ["id"]),
    uuid: readString(record, ["uuid"]),
    name: readString(record, NAME_KEYS) ?? fallbackName,
    status: readString(record, ["status", "state"]),
    raw: record,
  };
}

function extractSides(
  record: RawRecord,
  context?: Partial<GGArenaLookupContext>,
): GGArenaMatchupSide[] {
  const candidates: unknown[] = [];

  for (const key of SIDE_ARRAY_KEYS) {
    const value = record[key];
    if (Array.isArray(value)) candidates.push(...value);
  }

  for (const [left, right] of SIDE_PAIR_KEYS) {
    if (record[left] !== undefined || record[right] !== undefined) {
      candidates.push(record[left], record[right]);
    }
  }

  if (candidates.length === 0) {
    const leftName = readString(record, ["team1_name", "team_1_name", "home_name"]);
    const rightName = readString(record, ["team2_name", "team_2_name", "away_name"]);
    if (leftName || rightName) {
      candidates.push(
        { name: leftName ?? "Team 1", score: readNumber(record, ["team1_score", "home_score"]) },
        { name: rightName ?? "Team 2", score: readNumber(record, ["team2_score", "away_score"]) },
      );
    }
  }

  return candidates
    .filter((candidate): candidate is string | RawRecord => Boolean(candidate))
    .map((candidate, index) => normalizeSide(candidate, index, context))
    .filter((side, index, sides) => {
      return sides.findIndex((other) => other.name === side.name && other.id === side.id) === index;
    });
}

function normalizeSide(
  value: string | RawRecord,
  index: number,
  context?: Partial<GGArenaLookupContext>,
): GGArenaMatchupSide {
  if (typeof value === "string") {
    return {
      id: null,
      clubId: null,
      teamId: null,
      name: value,
      score: null,
      isSurfBulls: matchesSurfBulls(value, context),
    };
  }

  const teamRecord = findNestedRecord(value, ["team", "signup", "club", "user"]);
  const name =
    readStringFromNested(value, ["team", "signup", "club", "user"], NAME_KEYS) ??
    readString(value, NAME_KEYS) ??
    `Team ${index + 1}`;

  const id = readNumber(value, ["id", "signup_id", "signupId"]);
  const clubId =
    readNumber(value, ["club_id", "clubId"]) ??
    readNestedId(value, ["club"]) ??
    (teamRecord ? readNumber(teamRecord, ["club_id", "clubId"]) : null);
  const teamId =
    readNumber(value, ["team_id", "teamId"]) ??
    readNestedId(value, ["team"]) ??
    (teamRecord ? readNumber(teamRecord, ["team_id", "teamId", "id"]) : null);

  return {
    id,
    clubId,
    teamId,
    name,
    score: readNumber(value, ["score", "points", "rounds", "wins", "result"]),
    isSurfBulls:
      (context?.clubId ? clubId === context.clubId : false) ||
      (context?.teamId ? teamId === context.teamId : false) ||
      matchesSurfBulls(value, context),
  };
}

function extractTabularRows(payload: unknown): RawRecord[] {
  const out: RawRecord[] = [];
  walk(payload, 0);
  return out;

  function walk(value: unknown, depth: number) {
    if (depth > 4) return;
    if (Array.isArray(value)) {
      for (const item of value) walk(item, depth + 1);
      return;
    }
    if (!isRecord(value)) return;

    const hasName = Boolean(
      readString(value, NAME_KEYS) ??
        readStringFromNested(value, ["team", "signup", "club", "user", "player"], NAME_KEYS),
    );
    const hasMetric = Object.values(value).some((item) => typeof item === "number");
    if (hasName && hasMetric) {
      out.push(value);
      return;
    }

    for (const key of COLLECTION_KEYS) {
      if (value[key] !== undefined) walk(value[key], depth + 1);
    }
  }
}

function numericMetrics(record: RawRecord): GGArenaStatMetric[] {
  const blocked = new Set([
    "id",
    "team_id",
    "teamId",
    "club_id",
    "clubId",
    "user_id",
    "userId",
    "signup_id",
    "signupId",
    "competition_id",
    "competitionId",
    "division_id",
    "divisionId",
    "rank",
    "place",
    "position",
  ]);

  return Object.entries(record)
    .flatMap(([key, value]) => {
      if (blocked.has(key)) return [];
      if (typeof value === "number" && Number.isFinite(value)) {
        return [{ key, label: labelize(key), value }];
      }
      if (typeof value === "string") {
        const parsed = Number(value);
        if (value.trim() !== "" && Number.isFinite(parsed) && !blocked.has(key)) {
          return [{ key, label: labelize(key), value: parsed }];
        }
      }
      return [];
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

function readDate(record: RawRecord): string | null {
  for (const key of DATE_KEYS) {
    const value = record[key];
    if (typeof value === "string" && !Number.isNaN(new Date(value).getTime())) return value;
  }
  return null;
}

function readString(record: RawRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function readNumber(record: RawRecord, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function readNestedId(record: RawRecord, keys: string[]): number | null {
  const nested = findNestedRecord(record, keys);
  return nested ? readNumber(nested, ["id"]) : null;
}

function readStringFromNested(
  record: RawRecord,
  nestedKeys: string[],
  valueKeys: string[],
): string | null {
  const nested = findNestedRecord(record, nestedKeys);
  return nested ? readString(nested, valueKeys) : null;
}

function findNestedRecord(record: RawRecord, keys: string[]): RawRecord | null {
  for (const key of keys) {
    const value = record[key];
    if (isRecord(value)) return value;
  }
  return null;
}

function collectStrings(value: unknown, depth = 0): string[] {
  if (depth > 4 || value === null || value === undefined) return [];
  if (typeof value === "string") return [value];
  if (typeof value === "number") return [String(value)];
  if (Array.isArray(value)) return value.flatMap((item) => collectStrings(item, depth + 1));
  if (!isRecord(value)) return [];
  return Object.values(value).flatMap((item) => collectStrings(item, depth + 1));
}

function labelize(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
