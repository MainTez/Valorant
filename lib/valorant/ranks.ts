const EPISODE5_COMPETITIVE_TIERS_UUID = "03621f52-342b-cf4e-4f86-9350a49c6d04";

export interface CompetitiveTierAsset {
  largeIcon: string;
  smallIcon: string;
}

export interface RankTheme {
  accent: string;
  accentSoft: string;
  ring: string;
}

const RANK_NAME_TO_TIER_ID: Record<string, number> = {
  unranked: 0,
  "iron 1": 3,
  "iron 2": 4,
  "iron 3": 5,
  "bronze 1": 6,
  "bronze 2": 7,
  "bronze 3": 8,
  "silver 1": 9,
  "silver 2": 10,
  "silver 3": 11,
  "gold 1": 12,
  "gold 2": 13,
  "gold 3": 14,
  "platinum 1": 15,
  "platinum 2": 16,
  "platinum 3": 17,
  "diamond 1": 18,
  "diamond 2": 19,
  "diamond 3": 20,
  "ascendant 1": 21,
  "ascendant 2": 22,
  "ascendant 3": 23,
  "immortal 1": 24,
  "immortal 2": 25,
  "immortal 3": 26,
  radiant: 27,
};

export function resolveTierId(tierId?: number | null, rank?: string | null): number | null {
  if (typeof tierId === "number" && tierId >= 0) {
    return tierId;
  }

  const normalizedRank = (rank ?? "").trim().toLowerCase();
  return RANK_NAME_TO_TIER_ID[normalizedRank] ?? null;
}

export function getCompetitiveTierAsset(tierId?: number | null): CompetitiveTierAsset | null {
  if (typeof tierId !== "number" || tierId < 0) {
    return null;
  }

  return {
    largeIcon: `https://media.valorant-api.com/competitivetiers/${EPISODE5_COMPETITIVE_TIERS_UUID}/${tierId}/largeicon.png`,
    smallIcon: `https://media.valorant-api.com/competitivetiers/${EPISODE5_COMPETITIVE_TIERS_UUID}/${tierId}/smallicon.png`,
  };
}

export function getRankTheme(tierId?: number | null, rank?: string | null): RankTheme {
  if (tierId === 27 || /^radiant/i.test(rank ?? "")) {
    return { accent: "#f5e68c", accentSoft: "rgba(245, 230, 140, 0.28)", ring: "rgba(245, 230, 140, 0.5)" };
  }
  if ((tierId ?? 0) >= 24 || /^immortal/i.test(rank ?? "")) {
    return { accent: "#ff5b77", accentSoft: "rgba(255, 91, 119, 0.22)", ring: "rgba(255, 91, 119, 0.45)" };
  }
  if ((tierId ?? 0) >= 21 || /^ascendant/i.test(rank ?? "")) {
    return { accent: "#39f6cf", accentSoft: "rgba(57, 246, 207, 0.2)", ring: "rgba(57, 246, 207, 0.42)" };
  }
  if ((tierId ?? 0) >= 18 || /^diamond/i.test(rank ?? "")) {
    return { accent: "#b98cff", accentSoft: "rgba(185, 140, 255, 0.2)", ring: "rgba(185, 140, 255, 0.45)" };
  }
  if ((tierId ?? 0) >= 15 || /^platinum/i.test(rank ?? "")) {
    return { accent: "#45d8ff", accentSoft: "rgba(69, 216, 255, 0.18)", ring: "rgba(69, 216, 255, 0.4)" };
  }
  if ((tierId ?? 0) >= 12 || /^gold/i.test(rank ?? "")) {
    return { accent: "#f0c55f", accentSoft: "rgba(240, 197, 95, 0.18)", ring: "rgba(240, 197, 95, 0.4)" };
  }
  if ((tierId ?? 0) >= 9 || /^silver/i.test(rank ?? "")) {
    return { accent: "#d9e2ef", accentSoft: "rgba(217, 226, 239, 0.16)", ring: "rgba(217, 226, 239, 0.35)" };
  }
  if ((tierId ?? 0) >= 6 || /^bronze/i.test(rank ?? "")) {
    return { accent: "#c48a55", accentSoft: "rgba(196, 138, 85, 0.18)", ring: "rgba(196, 138, 85, 0.38)" };
  }
  if ((tierId ?? 0) >= 3 || /^iron/i.test(rank ?? "")) {
    return { accent: "#8f959d", accentSoft: "rgba(143, 149, 157, 0.18)", ring: "rgba(143, 149, 157, 0.35)" };
  }

  return { accent: "#7ddcff", accentSoft: "rgba(125, 220, 255, 0.16)", ring: "rgba(125, 220, 255, 0.35)" };
}
