import type { GGArenaStandingRow, GGArenaStatRow } from "@/lib/ggarena/normalize";

export interface TournamentStatGroup {
  scope: string;
  rows: GGArenaStatRow[];
}

const FALLBACK_SCOPE = "Tournament";

export function groupTournamentStatRows(rows: GGArenaStatRow[]): TournamentStatGroup[] {
  const groups = new Map<string, GGArenaStatRow[]>();

  for (const row of rows) {
    const scope = row.scope ?? FALLBACK_SCOPE;
    const groupRows = groups.get(scope) ?? [];
    groupRows.push(row);
    groups.set(scope, groupRows);
  }

  return Array.from(groups, ([scope, groupRows]) => ({
    scope,
    rows: groupRows,
  }));
}

export function getTournamentStatRowKey(row: GGArenaStatRow | null | undefined) {
  if (!row) return null;
  const scope = row.scope ?? FALLBACK_SCOPE;
  const identity = row.id === null ? normalizeTeamName(row.name) : `id-${row.id}`;
  return `${scope}::${identity}`;
}

export function getDefaultTournamentStatKey(rows: GGArenaStatRow[]) {
  return getTournamentStatRowKey(rows.find((row) => row.isSurfBulls) ?? rows[0]);
}

export function findTournamentStatForStanding(
  standing: GGArenaStandingRow,
  statRows: GGArenaStatRow[],
) {
  const standingScope = standing.scope ?? FALLBACK_SCOPE;
  const standingName = normalizeTeamName(standing.name);

  return (
    statRows.find(
      (row) =>
        standing.id !== null &&
        row.id === standing.id &&
        (row.scope ?? FALLBACK_SCOPE) === standingScope,
    ) ??
    statRows.find((row) => standing.id !== null && row.id === standing.id) ??
    statRows.find(
      (row) =>
        normalizeTeamName(row.name) === standingName &&
        (row.scope ?? FALLBACK_SCOPE) === standingScope,
    ) ??
    statRows.find((row) => normalizeTeamName(row.name) === standingName) ??
    null
  );
}

function normalizeTeamName(name: string) {
  return name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
