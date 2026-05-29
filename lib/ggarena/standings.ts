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
  }));
}

function sortStandingRowsByPoints(rows: GGArenaStandingRow[]) {
  return [...rows].sort((a, b) => {
    const points = (b.points ?? Number.NEGATIVE_INFINITY) - (a.points ?? Number.NEGATIVE_INFINITY);
    if (points !== 0) return points;
    if (a.rank != null || b.rank != null) {
      return (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER);
    }
    return a.name.localeCompare(b.name);
  });
}

export function isStandingGroupOpenByDefault(
  group: StandingGroup,
  groupCount: number,
): boolean {
  return groupCount === 1 || group.rows.some((row) => row.isSurfBulls);
}
