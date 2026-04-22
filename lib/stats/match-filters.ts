import type { NormalizedMatch } from "@/types/domain";

function normalizeMode(mode: string | null | undefined): string {
  return (mode ?? "").toLowerCase().replace(/[^a-z]/g, "");
}

export function isCoreStatsMode(mode: string | null | undefined): boolean {
  const normalized = normalizeMode(mode);
  if (!normalized) return true;

  return normalized !== "deathmatch" && normalized !== "teamdeathmatch";
}

export function filterCoreStatsMatches<T extends Pick<NormalizedMatch, "mode">>(
  matches: T[],
): T[] {
  return matches.filter((match) => isCoreStatsMode(match.mode));
}
