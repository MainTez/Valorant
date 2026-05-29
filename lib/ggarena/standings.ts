import type { GGArenaStandingRow } from "@/lib/ggarena/normalize";

export interface StandingGroup {
  scope: string;
  rows: GGArenaStandingRow[];
}

export function groupStandingRows(rows: GGArenaStandingRow[]): StandingGroup[] {
  const groups = new Map<string, GGArenaStandingRow[]>();

  for (const row of rows) {
    const scope = row.scope ?? "Tournament";
    const groupRows = groups.get(scope) ?? [];
    groupRows.push(row);
    groups.set(scope, groupRows);
  }

  return Array.from(groups, ([scope, groupRows]) => ({
    scope,
    rows: sortStandingRowsByPoints(groupRows),
  })).sort((a, b) => divisionOrder(a.scope) - divisionOrder(b.scope) || a.scope.localeCompare(b.scope));
}

function sortStandingRowsByPoints(rows: GGArenaStandingRow[]) {
  return [...rows].sort((a, b) => {
    const points = compareDesc(a.points, b.points);
    if (points !== 0) return points;
    const wins = compareDesc(a.wins, b.wins);
    if (wins !== 0) return wins;
    const losses = compareAsc(a.losses, b.losses);
    if (losses !== 0) return losses;
    if (a.rank != null || b.rank != null) {
      return compareAsc(a.rank, b.rank);
    }
    return a.name.localeCompare(b.name);
  });
}

function compareDesc(a: number | null, b: number | null) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

function compareAsc(a: number | null, b: number | null) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

function divisionOrder(scope: string) {
  const match = scope.match(/\b([1-9])(?:\.|st|nd|rd|th)?\b/i) ?? scope.match(/division\s*([1-9])/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

export function isStandingGroupOpenByDefault(
  group: StandingGroup,
  groupCount: number,
): boolean {
  return groupCount === 1 || group.rows.some((row) => row.isSurfBulls);
}
