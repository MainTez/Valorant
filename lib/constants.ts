export const APP_NAME = "Esport Hub";

export type TeamSlug = "surf-n-bulls" | "molgarians";
export type TeamAccent = "gold" | "blue";

export const TEAM_IDS = {
  "surf-n-bulls": "00000000-0000-0000-0000-000000000001",
  molgarians: "00000000-0000-0000-0000-000000000002",
} as const;

export interface TeamMeta {
  id: string;
  slug: TeamSlug;
  name: string;
  shortName: string;
  accent: TeamAccent;
  accentHex: string;
  glowHex: string;
  motto: string;
  pitch: string;
}

export const TEAMS: Record<TeamSlug, TeamMeta> = {
  "surf-n-bulls": {
    id: TEAM_IDS["surf-n-bulls"],
    slug: "surf-n-bulls",
    name: "Surf'n Bulls",
    shortName: "SNB",
    accent: "blue",
    accentHex: "#33b8ff",
    glowHex: "#1a7ac8",
    motto: "Wave pressure, punish space, stay composed.",
    pitch: "Fast pressure, sharp reads, and calm control when the round gets heavy.",
  },
  molgarians: {
    id: TEAM_IDS.molgarians,
    slug: "molgarians",
    name: "Molgarians",
    shortName: "MLG",
    accent: "gold",
    accentHex: "#f3bf4c",
    glowHex: "#b98316",
    motto: "Two teams. One community. One elite standard.",
    pitch: "Disciplined setups, clean comms, and a ruthless finish when it matters.",
  },
};

const TEAMS_BY_ID = Object.fromEntries(
  Object.values(TEAMS).map((team) => [team.id, team]),
) as Record<string, TeamMeta>;

export function teamBySlug(slug: string | null | undefined): TeamMeta | null {
  if (!slug) return null;
  return (TEAMS as Record<string, TeamMeta>)[slug] ?? null;
}

export function teamById(id: string | null | undefined): TeamMeta | null {
  if (!id) return null;
  return TEAMS_BY_ID[id] ?? null;
}

// Valorant rank ladder (index 0..26) used for next-rank prediction
export const RANK_LADDER: string[] = [
  "Iron 1", "Iron 2", "Iron 3",
  "Bronze 1", "Bronze 2", "Bronze 3",
  "Silver 1", "Silver 2", "Silver 3",
  "Gold 1", "Gold 2", "Gold 3",
  "Platinum 1", "Platinum 2", "Platinum 3",
  "Diamond 1", "Diamond 2", "Diamond 3",
  "Ascendant 1", "Ascendant 2", "Ascendant 3",
  "Immortal 1", "Immortal 2", "Immortal 3",
  "Radiant",
];

export function rankIndex(rank?: string | null): number {
  if (!rank) return -1;
  const norm = rank.trim();
  const idx = RANK_LADDER.findIndex(
    (r) => r.toLowerCase() === norm.toLowerCase(),
  );
  return idx;
}

export function rankAtIndex(i: number): string {
  return RANK_LADDER[Math.max(0, Math.min(RANK_LADDER.length - 1, i))];
}

export const AGENTS = [
  "Astra","Breach","Brimstone","Chamber","Clove","Cypher","Deadlock","Fade",
  "Gekko","Harbor","Iso","Jett","KAY/O","Killjoy","Neon","Omen","Phoenix",
  "Raze","Reyna","Sage","Skye","Sova","Tejo","Viper","Vyse","Yoru",
] as const;

export const MAPS = [
  "Ascent","Bind","Breeze","Corrode","Fracture","Haven","Icebox","Lotus",
  "Pearl","Split","Sunset",
] as const;

export const DEFAULT_CHANNELS = [
  "general",
  "match-day",
  "strats",
  "routines",
  "review",
  "announcements",
] as const;

export const HENRIK_CACHE_TTLS = {
  account: 60 * 60,          // 1h
  matches: 10 * 60,          // 10m
  mmr: 2 * 60,               // 2m
  mmrHistory: 15 * 60,       // 15m
} as const;

export const AI_PREDICTION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
