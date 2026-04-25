export interface TrackerScoreInput {
  sampleSize?: number;
  kdRatio?: number | null;
  acs?: number | null;
  adr?: number | null;
  headshotPct?: number | null;
  winRate?: number | null;
}

export interface TrackerScore {
  value: number;
  label: string;
  confidenceLabel: string;
  accent: string;
}

const COMPONENTS = {
  acs: { min: 150, max: 305, weight: 320 },
  kdRatio: { min: 0.8, max: 1.5, weight: 245 },
  winRate: { min: 40, max: 66, weight: 180 },
  adr: { min: 100, max: 172, weight: 135 },
  headshotPct: { min: 10, max: 31, weight: 60 },
} as const;

const TIERS = [
  { min: 860, label: "Elite form", accent: "#f4c95d" },
  { min: 740, label: "Sharp form", accent: "#7dd3fc" },
  { min: 610, label: "Locked in", accent: "#34d399" },
  { min: 470, label: "Stable read", accent: "#d6a74a" },
  { min: 0, label: "Needs review", accent: "#fb7185" },
] as const;

export function buildTrackerScore(input: TrackerScoreInput): TrackerScore | null {
  const parts = [
    scorePart(input.acs, COMPONENTS.acs),
    scorePart(input.kdRatio, COMPONENTS.kdRatio),
    scorePart(input.winRate, COMPONENTS.winRate),
    scorePart(input.adr, COMPONENTS.adr),
    scorePart(input.headshotPct, COMPONENTS.headshotPct),
  ].filter((part): part is { score: number; weight: number } => part != null);

  if (parts.length === 0) return null;

  const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0);
  const weightedScore = parts.reduce((sum, part) => sum + part.score, 0) / totalWeight;
  const sampleSize = Math.max(0, input.sampleSize ?? 0);
  const sampleFactor = sampleSize > 0 ? Math.min(sampleSize, 10) / 10 : 0.68;
  const confidence = sampleSize > 0 ? 0.82 + sampleFactor * 0.18 : 0.86;
  const sampleBonus = sampleSize > 0 ? sampleFactor * 44 : 26;
  const value = clamp(Math.round(weightedScore * 956 * confidence + sampleBonus), 1, 1000);
  const tier = TIERS.find((entry) => value >= entry.min) ?? TIERS[TIERS.length - 1];

  return {
    value,
    label: tier.label,
    confidenceLabel: sampleSize >= 10
      ? "10-match read"
      : sampleSize > 0
        ? `${sampleSize}-match read`
        : "profile sync",
    accent: tier.accent,
  };
}

function scorePart(
  value: number | null | undefined,
  band: { min: number; max: number; weight: number },
) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return {
    score: normalize(value, band.min, band.max) * band.weight,
    weight: band.weight,
  };
}

function normalize(value: number, min: number, max: number) {
  if (max <= min) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
