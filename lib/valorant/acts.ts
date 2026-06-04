import type { NormalizedMatch, NormalizedMmrHistoryEntry } from "../../types/domain.ts";

export const UNKNOWN_VALORANT_ACT_KEY = "unknown-act";

export interface ValorantAct {
  key: string;
  label: string;
}

export interface CurrentActMatchScope {
  act: ValorantAct;
  matches: NormalizedMatch[];
  totalMatches: number;
}

interface StoredMatchRaw {
  meta?: {
    season?: string | { id?: string | null; short?: string | null } | null;
  } | null;
}

export function filterMatchesToCurrentAct(matches: NormalizedMatch[]): CurrentActMatchScope {
  const sorted = [...matches].sort(compareStartedAtDesc);
  const currentAct =
    sorted.map(matchAct).find((act) => act.key !== UNKNOWN_VALORANT_ACT_KEY) ??
    { key: UNKNOWN_VALORANT_ACT_KEY, label: "Unknown Act" };

  if (currentAct.key === UNKNOWN_VALORANT_ACT_KEY) {
    return { act: currentAct, matches, totalMatches: matches.length };
  }

  return {
    act: currentAct,
    matches: matches.filter((match) => matchAct(match).key === currentAct.key),
    totalMatches: matches.length,
  };
}

export function filterMmrHistoryToMatchWindow(
  history: NormalizedMmrHistoryEntry[],
  matches: NormalizedMatch[],
): NormalizedMmrHistoryEntry[] {
  const oldestMatchTime = minValidTime(matches.map((match) => match.startedAt));
  if (oldestMatchTime === null) return history;

  return history.filter((entry) => {
    const time = new Date(entry.date).getTime();
    return !Number.isFinite(time) || time >= oldestMatchTime;
  });
}

function matchAct(match: NormalizedMatch): ValorantAct {
  const raw = match.raw as StoredMatchRaw | undefined;
  const season = raw?.meta?.season;

  if (typeof season === "string" && season.trim()) {
    return { key: season.trim(), label: formatActLabel(season.trim()) };
  }

  if (season && typeof season === "object") {
    const short = season.short?.trim();
    const id = season.id?.trim();
    const key = id || short;
    const labelSource = short || id;
    if (key && labelSource) {
      return { key, label: formatActLabel(labelSource) };
    }
  }

  return { key: UNKNOWN_VALORANT_ACT_KEY, label: "Unknown Act" };
}

function formatActLabel(value: string): string {
  const normalized = value.trim().toUpperCase();
  const compact = normalized.match(/^E(\d+)A(\d+)$/);
  if (compact) return `E${compact[1]} A${compact[2]}`;
  return normalized;
}

function compareStartedAtDesc(a: NormalizedMatch, b: NormalizedMatch) {
  return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
}

function minValidTime(values: string[]) {
  const times = values
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));
  if (times.length === 0) return null;
  return Math.min(...times);
}
