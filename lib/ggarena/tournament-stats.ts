import type { GGArenaStandingRow, GGArenaStatRow } from "@/lib/ggarena/normalize";

export interface TournamentStatTeam {
  id: number | null;
  name: string;
  scope: string;
  isSurfBulls: boolean;
  players: GGArenaStatRow[];
}

export interface TournamentStatGroup {
  scope: string;
  teams: TournamentStatTeam[];
}

export interface TournamentStatSelection {
  teamKey: string | null;
  playerKey: string | null;
}

const FALLBACK_SCOPE = "Tournament";
const UNKNOWN_TEAM = "Unknown team";

export function groupTournamentStatsByTeam(
  rows: GGArenaStatRow[],
  standings: GGArenaStandingRow[] = [],
): TournamentStatGroup[] {
  const groups = new Map<string, Map<string, TournamentStatTeam>>();
  const standingLookup = buildStandingLookup(standings);
  const hasStandingTeams = standings.length > 0;

  for (const standing of standings) {
    upsertTeam(groups, {
      id: standing.id,
      name: standing.name,
      scope: standing.scope ?? FALLBACK_SCOPE,
      isSurfBulls: standing.isSurfBulls,
      players: [],
    });
  }

  for (const row of rows) {
    const standing = findStandingForStatRow(row, standingLookup);
    if (!standing && hasStandingTeams) continue;

    const scope = standing?.scope ?? statScope(row);
    const seed = standing
      ? buildTeamFromStanding(standing, row, scope)
      : buildTeamFromStatRow(row, scope);
    const team = upsertTeam(groups, seed);
    const scopedRow = applyTeamToStatRow(row, team);
    addPlayer(team, scopedRow);
    team.isSurfBulls = team.isSurfBulls || row.isSurfBulls;
  }

  return Array.from(groups, ([scope, teamMap]) => ({
    scope,
    teams: Array.from(teamMap.values()).sort(sortTeams),
  }));
}

export function getTournamentStatTeamKey(team: TournamentStatTeam | null | undefined) {
  if (!team) return null;
  const identity = team.id === null ? normalizeName(team.name) : `id-${team.id}`;
  return `${team.scope}::${identity}`;
}

export function getTournamentStatPlayerKey(row: GGArenaStatRow | null | undefined) {
  if (!row) return null;
  const scope = statScope(row);
  const teamIdentity = row.teamId === null ? normalizeName(row.teamName ?? UNKNOWN_TEAM) : `team-${row.teamId}`;
  const playerIdentity =
    row.playerId === null
      ? normalizeName(row.playerName ?? row.name)
      : `player-${row.playerId}`;
  return `${scope}::${teamIdentity}::${playerIdentity}`;
}

export function getDefaultTournamentStatSelection(
  groups: TournamentStatGroup[],
): TournamentStatSelection {
  const teams = groups.flatMap((group) => group.teams);
  const team = teams.find((item) => item.isSurfBulls) ?? teams[0] ?? null;
  return {
    teamKey: getTournamentStatTeamKey(team),
    playerKey: getTournamentStatPlayerKey(team?.players[0]),
  };
}

export function findTournamentStatTeamForStanding(
  standing: GGArenaStandingRow,
  groups: TournamentStatGroup[],
) {
  const standingScope = standing.scope ?? FALLBACK_SCOPE;
  const standingName = normalizeName(standing.name);
  const teams = groups.flatMap((group) => group.teams);

  return (
    teams.find(
      (team) =>
        standing.id !== null &&
        team.id === standing.id &&
        team.scope === standingScope,
    ) ??
    teams.find((team) => standing.id !== null && team.id === standing.id) ??
    teams.find(
      (team) => normalizeName(team.name) === standingName && team.scope === standingScope,
    ) ??
    teams.find((team) => normalizeName(team.name) === standingName) ??
    null
  );
}

export function findTournamentStatTeamByKey(
  groups: TournamentStatGroup[],
  key: string | null,
) {
  if (!key) return null;
  return groups
    .flatMap((group) => group.teams)
    .find((team) => getTournamentStatTeamKey(team) === key) ?? null;
}

export function findTournamentStatPlayerByKey(
  team: TournamentStatTeam | null,
  key: string | null,
) {
  if (!team || !key) return null;
  return team.players.find((player) => getTournamentStatPlayerKey(player) === key) ?? null;
}

function upsertTeam(
  groups: Map<string, Map<string, TournamentStatTeam>>,
  seed: TournamentStatTeam,
) {
  const group = groups.get(seed.scope) ?? new Map<string, TournamentStatTeam>();
  const key = teamIdentityKey(seed);
  const existing = group.get(key) ?? findTeamByName(group, seed.name);
  if (existing) {
    existing.isSurfBulls = existing.isSurfBulls || seed.isSurfBulls;
    if (existing.id === null && seed.id !== null) existing.id = seed.id;
    if (existing.name === UNKNOWN_TEAM && seed.name !== UNKNOWN_TEAM) existing.name = seed.name;
    return existing;
  }

  group.set(key, seed);
  groups.set(seed.scope, group);
  return seed;
}

function buildTeamFromStanding(
  standing: GGArenaStandingRow,
  row: GGArenaStatRow,
  scope: string,
): TournamentStatTeam {
  return {
    id: standing.id,
    name: standing.name,
    scope,
    isSurfBulls: standing.isSurfBulls || row.isSurfBulls,
    players: [],
  };
}

function buildTeamFromStatRow(row: GGArenaStatRow, scope: string): TournamentStatTeam {
  return {
    id: row.teamId ?? (row.playerName ? null : row.id),
    name: row.teamName ?? (row.isSurfBulls ? "Surf'n Bulls" : row.playerName ? UNKNOWN_TEAM : row.name),
    scope,
    isSurfBulls: row.isSurfBulls,
    players: [],
  };
}

function teamIdentityKey(team: TournamentStatTeam) {
  return team.id === null ? `name:${normalizeName(team.name)}` : `id:${team.id}`;
}

function findTeamByName(group: Map<string, TournamentStatTeam>, name: string) {
  const normalized = normalizeName(name);
  return Array.from(group.values()).find((team) => normalizeName(team.name) === normalized);
}

function applyTeamToStatRow(row: GGArenaStatRow, team: TournamentStatTeam): GGArenaStatRow {
  if (
    row.scope === team.scope &&
    row.teamId === team.id &&
    row.teamName === team.name &&
    (!team.isSurfBulls || row.isSurfBulls)
  ) {
    return row;
  }

  return {
    ...row,
    scope: team.scope,
    teamId: team.id,
    teamName: team.name,
    isSurfBulls: row.isSurfBulls || team.isSurfBulls,
  };
}

function addPlayer(team: TournamentStatTeam, row: GGArenaStatRow) {
  const key = getTournamentStatPlayerKey(row);
  if (team.players.some((player) => getTournamentStatPlayerKey(player) === key)) return;
  team.players.push(row);
}

function statScope(row: GGArenaStatRow) {
  return row.scope ?? FALLBACK_SCOPE;
}

interface StandingLookup {
  standings: GGArenaStandingRow[];
  byId: Map<number, GGArenaStandingRow[]>;
  byName: Map<string, GGArenaStandingRow[]>;
  surfRows: GGArenaStandingRow[];
}

function buildStandingLookup(standings: GGArenaStandingRow[]): StandingLookup {
  const byId = new Map<number, GGArenaStandingRow[]>();
  const byName = new Map<string, GGArenaStandingRow[]>();
  const surfRows: GGArenaStandingRow[] = [];

  for (const standing of standings) {
    if (standing.id !== null) addLookupValue(byId, standing.id, standing);
    addLookupValue(byName, normalizeName(standing.name), standing);
    if (standing.isSurfBulls) surfRows.push(standing);
  }

  return { standings, byId, byName, surfRows };
}

function findStandingForStatRow(row: GGArenaStatRow, lookup: StandingLookup) {
  if (lookup.standings.length === 0) return null;
  const preferredScope = statScope(row);
  const teamName = row.teamName ?? (row.playerName ? null : row.name);

  if (row.teamId !== null) {
    const idMatches = lookup.byId.get(row.teamId) ?? [];
    const match = findByPreferredScope(idMatches, preferredScope) ?? idMatches[0] ?? null;
    if (match) return match;
  }

  if (teamName) {
    const nameMatches = lookup.byName.get(normalizeName(teamName)) ?? [];
    const match = findByPreferredScope(nameMatches, preferredScope) ?? nameMatches[0] ?? null;
    if (match) return match;
  }

  if (row.isSurfBulls) {
    return findByPreferredScope(lookup.surfRows, preferredScope) ?? lookup.surfRows[0] ?? null;
  }

  return null;
}

function addLookupValue<K>(map: Map<K, GGArenaStandingRow[]>, key: K, value: GGArenaStandingRow) {
  const existing = map.get(key) ?? [];
  existing.push(value);
  map.set(key, existing);
}

function findByPreferredScope(rows: GGArenaStandingRow[], scope: string) {
  return rows.find((row) => (row.scope ?? FALLBACK_SCOPE) === scope) ?? null;
}

function sortTeams(a: TournamentStatTeam, b: TournamentStatTeam) {
  if (a.isSurfBulls !== b.isSurfBulls) return a.isSurfBulls ? -1 : 1;
  return a.name.localeCompare(b.name);
}

function normalizeName(name: string) {
  return name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
