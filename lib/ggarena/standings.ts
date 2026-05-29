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
    rows: groupRows,
  }));
}

export function isStandingGroupOpenByDefault(
  group: StandingGroup,
  groupCount: number,
): boolean {
  return groupCount === 1 || group.rows.some((row) => row.isSurfBulls);
}
