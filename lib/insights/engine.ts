import { clamp, mean, slope, stdev } from "@/lib/utils";
import { rankAtIndex, rankIndex } from "@/lib/constants";
import type { NormalizedMatch, NormalizedMmrHistoryEntry } from "@/types/domain";

export interface EngineInput {
  matches: NormalizedMatch[];
  mmrHistory?: NormalizedMmrHistoryEntry[];
  currentRank: string | null;
  currentRR: number | null;
}

export interface EngineOutput {
  predictedRank: string | null;
  predictedRankLow: string | null;
  predictedRankHigh: string | null;
  confidence: number; // 0..1
  momentum: number;   // -1..1
  consistency: number; // 0..1
  winRate: number;    // 0..1
  winRateRecent: number;
  rrTrend: number;    // per-game RR slope
  bestAgents: Array<{ agent: string; games: number; acs: number; winRate: number }>;
  weakMaps: Array<{ map: string; games: number; winRate: number }>;
  strengths: string[];
  weaknesses: string[];
  improvementSuggestions: string[];
  dataPoints: Record<string, number | string | null>;
  summary: string;
}

export function runEngine(input: EngineInput): EngineOutput {
  const all = [...input.matches].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
  const recent = all.slice(0, 10);
  const older = all.slice(10, 20);

  const nRecent = recent.length;
  const nTotal = all.length;

  const acsAll = all.map((m) => m.acs).filter(isFiniteNum);
  const acsRecent = recent.map((m) => m.acs).filter(isFiniteNum);
  const acsOlder = older.map((m) => m.acs).filter(isFiniteNum);

  const kdAll = all.map(kd).filter(isFiniteNum);
  const kdRecent = recent.map(kd).filter(isFiniteNum);

  const hsAll = all.map((m) => m.headshotPct).filter(isFiniteNum);
  const hsRecent = recent.map((m) => m.headshotPct).filter(isFiniteNum);

  const winsRecent = recent.filter((m) => m.result === "win").length;
  const decidedRecent = recent.filter((m) => m.result === "win" || m.result === "loss").length;
  const winRateRecent = decidedRecent > 0 ? winsRecent / decidedRecent : 0;

  const winsAll = all.filter((m) => m.result === "win").length;
  const decidedAll = all.filter((m) => m.result === "win" || m.result === "loss").length;
  const winRate = decidedAll > 0 ? winsAll / decidedAll : 0;

  const rrValues = (input.mmrHistory ?? [])
    .slice(0, 10)
    .map((h) => h.rrChange)
    .filter(isFiniteNum)
    .reverse();
  const rrTrend = rrValues.length >= 2 ? slope(rrValues) : 0;

  const acsRecentMean = mean(acsRecent);
  const acsOlderMean = mean(acsOlder);
  const momentumRaw =
    acsOlderMean > 0 ? (acsRecentMean - acsOlderMean) / acsOlderMean : 0;
  const momentum = clamp(momentumRaw, -1, 1);

  const acsStd = stdev(acsAll);
  const acsMean = mean(acsAll);
  const consistency = acsMean > 0 ? clamp(1 - acsStd / acsMean, 0, 1) : 0;

  // Agents aggregation
  const byAgent = new Map<string, { games: number; wins: number; acs: number[] }>();
  for (const m of all) {
    if (!m.agent) continue;
    const bucket = byAgent.get(m.agent) ?? { games: 0, wins: 0, acs: [] };
    bucket.games++;
    if (m.result === "win") bucket.wins++;
    if (isFiniteNum(m.acs)) bucket.acs.push(m.acs);
    byAgent.set(m.agent, bucket);
  }
  const bestAgents = [...byAgent.entries()]
    .filter(([, v]) => v.games >= 3)
    .map(([agent, v]) => ({
      agent,
      games: v.games,
      acs: Math.round(mean(v.acs)),
      winRate: v.games > 0 ? v.wins / v.games : 0,
    }))
    .sort(
      (a, b) =>
        b.acs * b.winRate * Math.sqrt(b.games) -
        a.acs * a.winRate * Math.sqrt(a.games),
    )
    .slice(0, 3);

  // Maps aggregation
  const byMap = new Map<string, { games: number; wins: number }>();
  for (const m of all) {
    const bucket = byMap.get(m.map) ?? { games: 0, wins: 0 };
    bucket.games++;
    if (m.result === "win") bucket.wins++;
    byMap.set(m.map, bucket);
  }
  const weakMaps = [...byMap.entries()]
    .filter(([, v]) => v.games >= 3 && v.wins / v.games < 0.4)
    .map(([map, v]) => ({
      map,
      games: v.games,
      winRate: v.games > 0 ? v.wins / v.games : 0,
    }))
    .sort((a, b) => a.winRate - b.winRate)
    .slice(0, 3);

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (mean(hsAll) > 25) strengths.push("Sharp headshot ratio");
  if (mean(hsAll) < 15 && hsAll.length >= 5) weaknesses.push("Low headshot percentage");
  if (mean(kdAll) > 1.15) strengths.push("Above-average K/D");
  if (mean(kdAll) < 0.9 && kdAll.length >= 5) weaknesses.push("Trading below 1.0 K/D");
  if (acsMean > 230) strengths.push("Strong impact (ACS)");
  if (acsMean < 160 && acsAll.length >= 5) weaknesses.push("Impact trailing (low ACS)");
  if (consistency > 0.7) strengths.push("Consistent match-to-match output");
  if (consistency < 0.55 && acsAll.length >= 5) weaknesses.push("Volatile form");
  if (winRateRecent > 0.6 && decidedRecent >= 5) strengths.push("Winning streak in last 10");
  if (winRateRecent < 0.4 && decidedRecent >= 5) weaknesses.push("Losing streak in last 10");
  if (momentum > 0.1) strengths.push("Positive performance trend");
  if (momentum < -0.1) weaknesses.push("Declining recent form");
  if (bestAgents[0] && bestAgents[0].winRate > 0.6) {
    strengths.push(`Best agent: ${bestAgents[0].agent}`);
  }
  if (weakMaps[0]) {
    weaknesses.push(`Struggling on ${weakMaps[0].map}`);
  }

  const improvement: string[] = [];
  if (weaknesses.includes("Low headshot percentage")) {
    improvement.push("Daily 20-minute aim routine with a focus on crosshair placement drills.");
  }
  if (weaknesses.includes("Volatile form")) {
    improvement.push("Warm up before ranked: 1 deathmatch + 1 unrated to stabilize inputs.");
  }
  if (momentum < -0.1) {
    improvement.push("Pause ranked after 2 losses; review a recent VOD before queuing again.");
  }
  if (weakMaps[0]) {
    improvement.push(`Dedicate one custom session to improving ${weakMaps[0].map} defaults.`);
  }
  if (bestAgents[0] && bestAgents[1] && bestAgents[1].winRate < 0.45) {
    improvement.push(`Narrow your agent pool — lean on ${bestAgents[0].agent} on climb days.`);
  }
  if (improvement.length === 0) {
    improvement.push("Keep momentum: repeat what's working, log a weekly review with your coach.");
  }

  // Rank prediction: ladder-index projection by RR trend
  const curIdx = rankIndex(input.currentRank);
  let predictedRank: string | null = null;
  let low: string | null = null;
  let high: string | null = null;
  if (curIdx >= 0) {
    const shift = Math.round(clamp(rrTrend * 3, -3, 3));
    const mid = clamp(curIdx + shift, 0, 26);
    predictedRank = rankAtIndex(mid);
    low = rankAtIndex(clamp(mid - 1, 0, 26));
    high = rankAtIndex(clamp(mid + 1, 0, 26));
  }

  // Confidence: based on n, consistency, rr trend stability
  const nScore = clamp(nTotal / 15, 0, 1);
  const stabilityScore = rrValues.length >= 5 ? clamp(1 - stdev(rrValues) / 20, 0, 1) : 0.4;
  const confidence = clamp(
    0.35 * nScore + 0.35 * consistency + 0.3 * stabilityScore,
    0.2,
    0.95,
  );

  const summaryBits: string[] = [];
  if (predictedRank) summaryBits.push(`Short-term outlook: ${predictedRank}`);
  if (momentum > 0.1) summaryBits.push(`momentum positive (${formatSigned(momentum)})`);
  else if (momentum < -0.1) summaryBits.push(`momentum declining (${formatSigned(momentum)})`);
  summaryBits.push(`win rate ${(winRate * 100).toFixed(0)}% (${decidedAll} games)`);
  const summary = summaryBits.join(" · ");

  return {
    predictedRank,
    predictedRankLow: low,
    predictedRankHigh: high,
    confidence: round(confidence, 2),
    momentum: round(momentum, 3),
    consistency: round(consistency, 2),
    winRate: round(winRate, 3),
    winRateRecent: round(winRateRecent, 3),
    rrTrend: round(rrTrend, 2),
    bestAgents,
    weakMaps,
    strengths,
    weaknesses,
    improvementSuggestions: improvement,
    dataPoints: {
      matchesAnalyzed: nTotal,
      matchesRecent: nRecent,
      acsMean: round(acsMean, 0),
      acsMeanRecent: round(acsRecentMean, 0),
      kdMean: round(mean(kdAll), 2),
      kdRecent: round(mean(kdRecent), 2),
      hsPctMean: round(mean(hsAll), 1),
      hsPctRecent: round(mean(hsRecent), 1),
      rrTrend: round(rrTrend, 2),
      currentRank: input.currentRank,
      currentRR: input.currentRR,
    },
    summary,
  };
}

function kd(m: NormalizedMatch): number {
  if (!isFiniteNum(m.kills) || !isFiniteNum(m.deaths)) return NaN;
  if (m.deaths === 0) return m.kills;
  return m.kills / m.deaths;
}

function isFiniteNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function round(n: number, digits: number): number {
  if (!Number.isFinite(n)) return 0;
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

function formatSigned(v: number): string {
  return (v >= 0 ? "+" : "") + (v * 100).toFixed(0) + "%";
}
