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
    const scope = statScope(row);
    const seed = buildTeamFromStatRow(row, scope);
    const team = upsertTeam(groups, seed);
    team.players.push(row);
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
  const existing = group.get(key);
  if (existing) {
    existing.isSurfBulls = existing.isSurfBulls || seed.isSurfBulls;
    return existing;
  }

  group.set(key, seed);
  groups.set(seed.scope, group);
  return seed;
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

function statScope(row: GGArenaStatRow) {
  return row.scope ?? FALLBACK_SCOPE;
}

function sortTeams(a: TournamentStatTeam, b: TournamentStatTeam) {
  if (a.isSurfBulls !== b.isSurfBulls) return a.isSurfBulls ? -1 : 1;
  return a.name.localeCompare(b.name);
}

function normalizeName(name: string) {
  return name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
