export type MatchMomentLabel =
  | "CARRIED ALL!!"
  | "INTED MATCH"
  | "TEAM SOLD HIM"
  | "GOT CARRIED"
  | "Won match"
  | "Lost match"
  | "Drew match";

export type MatchMomentSeverity = "hype" | "flame" | "warning" | "normal";

export interface MatchMomentInput {
  playerName: string;
  matchId: string;
  result: "win" | "loss" | "draw" | null;
  map: string | null;
  agent: string | null;
  scoreTeam: number | null;
  scoreOpponent: number | null;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  acs: number | null;
  adr: number | null;
  headshotPct: number | null;
  rankAfter?: string | null;
  rrChange?: number | null;
  startedAt?: string | null;
}

export interface BuiltMatchMoment {
  label: MatchMomentLabel;
  severity: MatchMomentSeverity;
  title: string;
  subtitle: string;
  performanceIndex: number;
  sound: "carry" | "inted" | "normal";
  stats: {
    kda: string;
    acs: number | null;
    adr: number | null;
    headshotPct: number | null;
    score: string;
  };
}

export function buildMatchMoment(input: MatchMomentInput): BuiltMatchMoment {
  const performanceIndex = calculatePerformanceIndex(input);
  const label = labelForMatch(input.result, performanceIndex);
  const severity = severityForLabel(label);
  const kda = `${safeInt(input.kills)}/${safeInt(input.deaths)}/${safeInt(input.assists)}`;
  const score = `${safeInt(input.scoreTeam)}-${safeInt(input.scoreOpponent)}`;
  const mapAgent = [input.agent, input.map].filter(Boolean).join(" on ") || "a match";

  return {
    label,
    severity,
    title: `${input.playerName} ${label}`,
    subtitle: `${kda} ${mapAgent} (${score})`,
    performanceIndex,
    sound: soundForLabel(label),
    stats: {
      kda,
      acs: finiteOrNull(input.acs),
      adr: finiteOrNull(input.adr),
      headshotPct: finiteOrNull(input.headshotPct),
      score,
    },
  };
}

export function calculatePerformanceIndex(input: MatchMomentInput): number {
  const kd = kdRatio(input.kills, input.deaths);
  const parts = [
    scorePart(input.acs, 125, 330, 34),
    scorePart(kd, 0.55, 1.85, 28),
    scorePart(input.adr, 80, 190, 18),
    scorePart(input.headshotPct, 8, 38, 8),
    scorePart((input.assists ?? 0) + (input.kills ?? 0) * 0.35, 3, 18, 12),
  ].filter((part): part is { value: number; weight: number } => part !== null);

  if (parts.length === 0) return input.result === "win" ? 52 : input.result === "loss" ? 42 : 48;

  const weight = parts.reduce((sum, part) => sum + part.weight, 0);
  const raw = parts.reduce((sum, part) => sum + part.value * part.weight, 0) / weight;
  const resultAdjustment = input.result === "win" ? 4 : input.result === "loss" ? -4 : 0;
  const marginAdjustment = scoreMarginAdjustment(input.scoreTeam, input.scoreOpponent);
  return clamp(Math.round(raw + resultAdjustment + marginAdjustment), 0, 100);
}

function labelForMatch(
  result: MatchMomentInput["result"],
  performanceIndex: number,
): MatchMomentLabel {
  if (result === "win" && performanceIndex >= 75) return "CARRIED ALL!!";
  if (result === "loss" && performanceIndex <= 35) return "INTED MATCH";
  if (result === "loss" && performanceIndex >= 70) return "TEAM SOLD HIM";
  if (result === "win" && performanceIndex <= 35) return "GOT CARRIED";
  if (result === "win") return "Won match";
  if (result === "loss") return "Lost match";
  return "Drew match";
}

function severityForLabel(label: MatchMomentLabel): MatchMomentSeverity {
  if (label === "CARRIED ALL!!" || label === "TEAM SOLD HIM") return "hype";
  if (label === "INTED MATCH") return "flame";
  if (label === "GOT CARRIED") return "warning";
  return "normal";
}

function soundForLabel(label: MatchMomentLabel): BuiltMatchMoment["sound"] {
  if (label === "CARRIED ALL!!" || label === "TEAM SOLD HIM") return "carry";
  if (label === "INTED MATCH" || label === "GOT CARRIED") return "inted";
  return "normal";
}

function scorePart(
  value: number | null | undefined,
  min: number,
  max: number,
  weight: number,
): { value: number; weight: number } | null {
  if (!isFiniteNumber(value)) return null;
  return { value: normalize(value, min, max) * 100, weight };
}

function scoreMarginAdjustment(
  scoreTeam: number | null | undefined,
  scoreOpponent: number | null | undefined,
): number {
  if (!isFiniteNumber(scoreTeam) || !isFiniteNumber(scoreOpponent)) return 0;
  const margin = scoreTeam - scoreOpponent;
  if (margin >= 7) return 3;
  if (margin <= -7) return -3;
  if (Math.abs(margin) <= 2) return 2;
  return 0;
}

function kdRatio(kills: number | null | undefined, deaths: number | null | undefined): number | null {
  if (!isFiniteNumber(kills) || !isFiniteNumber(deaths)) return null;
  return deaths === 0 ? kills : kills / Math.max(1, deaths);
}

function finiteOrNull(value: number | null | undefined): number | null {
  return isFiniteNumber(value) ? value : null;
}

function safeInt(value: number | null | undefined): number {
  return isFiniteNumber(value) ? Math.round(value) : 0;
}

function normalize(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
