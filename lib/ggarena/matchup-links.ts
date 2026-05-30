import type { GGArenaMatchup } from "@/lib/ggarena/normalize";

type MatchupLinkSeed = Pick<GGArenaMatchup, "id" | "uuid" | "name" | "startsAt">;

export function matchupLookupKey(matchup: MatchupLinkSeed) {
  if (matchup.id !== null) return String(matchup.id);
  if (matchup.uuid) return matchup.uuid;
  return `${matchup.name}-${matchup.startsAt ?? "unknown"}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function matchupDomId(matchup: MatchupLinkSeed) {
  return `match-${matchupLookupKey(matchup).replace(/[^a-zA-Z0-9_-]+/g, "-")}`;
}

export function tournamentMatchupHref(matchup: MatchupLinkSeed) {
  const key = matchupLookupKey(matchup);
  return `/tournaments?match=${encodeURIComponent(key)}#${matchupDomId(matchup)}`;
}

export function matchupMatchesKey(matchup: MatchupLinkSeed, selectedKey: string | null) {
  if (!selectedKey) return false;
  return selectedKey === String(matchup.id ?? "") || selectedKey === matchup.uuid || selectedKey === matchupLookupKey(matchup);
}
