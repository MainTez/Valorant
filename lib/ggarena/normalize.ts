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
  logoUrl: string | null;
  side: string | null;
  score: number | null;
  isSurfBulls: boolean;
}

export type GGArenaMatchupResult = "win" | "loss" | "draw";

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
  surfResult: GGArenaMatchupResult | null;
  scoreline: string | null;
}

export interface GGArenaStandingRow {
  id: number | null;
  name: string;
  scope: string | null;
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
  playerId: number | null;
  playerName: string | null;
  teamId: number | null;
  teamName: string | null;
  scope: string | null;
  isSurfBulls: boolean;
  metrics: GGArenaStatMetric[];
}

export interface GGArenaTeamPlayer {
  userId: number | null;
  name: string;
  teamId: number;
  teamName: string;
  raw: RawRecord;
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
  "start_time",
  "startTime",
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

const IMAGE_KEYS = [
  "logo_url",
  "logoUrl",
  "image_url",
  "imageUrl",
  "icon_url",
  "iconUrl",
  "avatar_url",
  "avatarUrl",
  "picture_url",
  "pictureUrl",
  "logo",
  "image",
  "icon",
  "avatar",
  "picture",
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
  const surfResult = resolveSurfResult(record, sides);
  const scoreline = formatSurfScoreline(sides);
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
    surfResult,
    scoreline,
  };
}

export function normalizeStandingRows(
  payload: unknown,
  context?: Partial<GGArenaLookupContext>,
  scope: string | null = null,
): GGArenaStandingRow[] {
  return extractTabularRows(payload).map((record, index) => {
    const signupRecord = findNestedRecord(record, ["signup"]);
    const nestedTeamRecord =
      findNestedRecord(record, ["team"]) ??
      (signupRecord ? findNestedRecord(signupRecord, ["team"]) : null);
    const name =
      (nestedTeamRecord ? readString(nestedTeamRecord, NAME_KEYS) : null) ??
      (signupRecord ? readString(signupRecord, NAME_KEYS) : null) ??
      readStringFromNested(record, ["club", "user"], NAME_KEYS) ??
      readString(record, NAME_KEYS) ??
      `Row ${index + 1}`;
    const signupId =
      readNumber(record, ["signup_id", "signupId"]) ??
      (signupRecord ? readNumber(signupRecord, ["id"]) : null);
    const teamId =
      readNumber(record, ["team_id", "teamId"]) ??
      (signupRecord ? readNumber(signupRecord, ["team_id", "teamId"]) : null) ??
      (nestedTeamRecord ? readNumber(nestedTeamRecord, ["id"]) : null);

    return {
      id:
        teamId ??
        signupId ??
        readNumber(record, ["id"]) ??
        readNestedId(record, ["club"]),
      name,
      scope,
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
      const playerName =
        readStringFromNested(record, ["user", "player"], NAME_KEYS) ??
        readString(record, [
          "player_name",
          "playerName",
          "user_name",
          "userName",
          "username",
          "riot_id",
          "riotId",
        ]);
      const teamName =
        readStringFromNested(record, ["team", "signup", "club"], NAME_KEYS) ??
        readString(record, [
          "team_name",
          "teamName",
          "signup_name",
          "signupName",
          "club_name",
          "clubName",
        ]);
      const fallbackName = readString(record, NAME_KEYS) ?? `Entry ${index + 1}`;
      const name = playerName ?? teamName ?? fallbackName;

      return {
        id: readNumber(record, [
          "id",
          "user_id",
          "userId",
          "player_id",
          "playerId",
          "paradise_user_id",
          "paradiseUserId",
          "team_id",
          "teamId",
        ]),
        name,
        playerId:
          readNumber(record, [
            "user_id",
            "userId",
            "player_id",
            "playerId",
            "paradise_user_id",
            "paradiseUserId",
          ]) ??
          readNestedId(record, ["user", "player"]),
        playerName,
        teamId:
          readNumber(record, ["team_id", "teamId", "signup_id", "signupId", "club_id", "clubId"]) ??
          readNestedId(record, ["team", "signup", "club"]),
        teamName,
        scope,
        isSurfBulls: matchesSurfBulls(record, context),
        metrics: numericMetrics(record),
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

  const homeSignup = record.home_signup ?? record.homeSignup;
  const awaySignup = record.away_signup ?? record.awaySignup;
  if (homeSignup !== undefined || awaySignup !== undefined) {
    candidates.push(
      withSideMetadata(homeSignup, "home", readNumber(record, ["home_score", "homeScore"])),
      withSideMetadata(awaySignup, "away", readNumber(record, ["away_score", "awayScore"])),
    );
  }

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
        {
          name: leftName ?? "Team 1",
          side: "home",
          score: readNumber(record, ["team1_score", "home_score"]),
        },
        {
          name: rightName ?? "Team 2",
          side: "away",
          score: readNumber(record, ["team2_score", "away_score"]),
        },
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
      logoUrl: null,
      side: null,
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
    logoUrl: readImageUrl(value) ?? (teamRecord ? readImageUrl(teamRecord) : null),
    side: readString(value, ["side"]) ?? null,
    score: readNumber(value, ["score", "points", "rounds", "wins", "result"]),
    isSurfBulls:
      (context?.clubId ? clubId === context.clubId : false) ||
      (context?.teamId ? teamId === context.teamId : false) ||
      matchesSurfBulls(value, context),
  };
}

function withSideMetadata(value: unknown, side: string, score: number | null) {
  if (!isRecord(value)) return value;
  return {
    ...value,
    side,
    score: score ?? readNumber(value, ["score", "points", "rounds", "wins", "result"]),
  };
}

function resolveSurfResult(
  record: RawRecord,
  sides: GGArenaMatchupSide[],
): GGArenaMatchupResult | null {
  const surfSide = sides.find((side) => side.isSurfBulls);
  if (!surfSide) return null;

  const opponentSide = sides.find((side) => !side.isSurfBulls);
  const winningSide = readString(record, ["winning_side", "winningSide"]);
  if (winningSide && surfSide.side) {
    const winning = normalizeText(winningSide);
    const surf = normalizeText(surfSide.side);
    if (winning && surf === winning) return "win";
    if (winning && opponentSide?.side && normalizeText(opponentSide.side) === winning) {
      return "loss";
    }
  }

  if (opponentSide && surfSide.score !== null && opponentSide.score !== null) {
    if (surfSide.score === opponentSide.score) return "draw";
    return surfSide.score > opponentSide.score ? "win" : "loss";
  }

  return null;
}

function formatSurfScoreline(sides: GGArenaMatchupSide[]) {
  const surfSide = sides.find((side) => side.isSurfBulls);
  const opponentSide = sides.find((side) => !side.isSurfBulls);
  if (!surfSide || !opponentSide) return null;
  if (surfSide.score === null || opponentSide.score === null) return null;
  return `${surfSide.score}-${opponentSide.score}`;
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
    "paradise_user_id",
    "paradiseUserId",
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

export function normalizeTeamPlayerRows(
  payload: unknown,
  teamId: number,
  teamName: string,
): GGArenaTeamPlayer[] {
  return unwrapCollection(payload)
    .map((value, index): GGArenaTeamPlayer | null => {
      if (!isRecord(value)) return null;
      const userRecord = findNestedRecord(value, ["user", "player"]);
      const userId =
        readNumber(value, ["user_id", "userId", "paradise_user_id", "paradiseUserId"]) ??
        (userRecord ? readNumber(userRecord, ["id"]) : null);
      const name =
        (userRecord ? readString(userRecord, ["user_name", "userName", ...NAME_KEYS]) : null) ??
        readString(value, NAME_KEYS) ??
        `Player ${index + 1}`;

      return {
        userId,
        name,
        teamId,
        teamName,
        raw: value,
      };
    })
    .filter((row): row is GGArenaTeamPlayer => Boolean(row));
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

function readImageUrl(record: RawRecord): string | null {
  const direct = readString(record, IMAGE_KEYS);
  if (direct && isLikelyImageUrl(direct)) return direct;

  for (const key of ["logo", "image", "icon", "avatar", "picture", "team", "club", "signup"]) {
    const value = record[key];
    if (!isRecord(value)) continue;
    const nested = readString(value, ["url", "src", "path", ...IMAGE_KEYS]);
    if (nested && isLikelyImageUrl(nested)) return nested;
  }

  return null;
}

function isLikelyImageUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith("/");
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
