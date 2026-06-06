import type { NormalizedMatch } from "@/types/domain";

export interface PlayerImprovementCard {
  id: string;
  title: string;
  focus: string;
  evidence: string;
  drill: string;
  priority: "high" | "medium" | "low";
}

export interface PlayerImprovementContext {
  actLabel: string;
  coachNotes?: string[];
  reviewActions?: string[];
}

export function buildPlayerImprovementCards(
  matches: NormalizedMatch[],
  context: PlayerImprovementContext,
): PlayerImprovementCard[] {
  if (matches.length === 0) {
    return [
      {
        id: "sample",
        title: "Build a current-ACT sample",
        focus: "Log or sync more matches before changing practice priorities.",
        evidence: `No ${context.actLabel} match sample is available yet.`,
        drill: "Play three tracked games, then review the lowest-value death from each map.",
        priority: "medium",
      },
      {
        id: "review",
        title: "Create one coach review target",
        focus: "Ask for one concrete mistake to fix from the next VOD.",
        evidence: coachContextEvidence(context),
        drill: "After the next match, create a review action and assign a measurable fix.",
        priority: "medium",
      },
      {
        id: "routine",
        title: "Keep practice measurable",
        focus: "Use one aim, one utility, and one comms goal per session.",
        evidence: "No current-ACT trend can be separated yet.",
        drill: "Write the goal before queue and mark it done only after reviewing one round.",
        priority: "low",
      },
    ];
  }

  const summary = summarize(matches);
  const recent = summarize(matches.slice(0, Math.min(5, matches.length)));
  const maps = summarizeMaps(matches);
  const agents = summarizeAgents(matches);
  const weakMap = maps[0] ?? null;
  const weakAgent = agents[0] ?? null;
  const cards: PlayerImprovementCard[] = [];

  if (summary.kd < 0.95 || recent.kd < summary.kd - 0.12 || summary.lossRate >= 55) {
    cards.push({
      id: "death-discipline",
      title: "Reduce low-value deaths",
      focus: "Take fewer isolated first contacts and only swing when a teammate can trade.",
      evidence: `${context.actLabel}: ${summary.kd.toFixed(2)} K/D across ${matches.length} matches; recent ${recent.kd.toFixed(2)} K/D over ${recent.sampleSize}.`,
      drill: "Review three deaths, label each as tradeable or isolated, then remove one isolated peek next match.",
      priority: summary.kd < 0.85 ? "high" : "medium",
    });
  }

  if (summary.hs < 18) {
    cards.push({
      id: "first-bullet",
      title: "Raise first-bullet accuracy",
      focus: "Slow the first bullet before committing to sprays.",
      evidence: `${context.actLabel}: ${summary.hs.toFixed(1)}% HS, below the 18% minimum target for clean rifle fights.`,
      drill: "Run 15 minutes of guardian/sheriff deathmatch; only count kills where the crosshair was pre-placed.",
      priority: summary.hs < 14 ? "high" : "medium",
    });
  }

  if (summary.acs < 190 || summary.adr < 125) {
    cards.push({
      id: "damage-conversion",
      title: "Convert utility into damage",
      focus: "Use flash, stun, smoke pressure, or double-swing timing before contact.",
      evidence: `${context.actLabel}: ${formatMetric(summary.acs)} ACS and ${formatMetric(summary.adr)} ADR over ${matches.length} matches.`,
      drill: "Pick two rounds and write the utility cue that should happen before your first fight.",
      priority: summary.acs < 170 ? "high" : "medium",
    });
  }

  if (weakMap && weakMap.games >= 2 && (weakMap.winRate <= 45 || weakMap.kd < 0.95)) {
    cards.push({
      id: "map-plan",
      title: `Fix ${weakMap.map} defaults`,
      focus: "Create one repeatable default for the weakest current-ACT map.",
      evidence: `${weakMap.map}: ${weakMap.games} games, ${weakMap.winRate.toFixed(0)}% WR, ${weakMap.kd.toFixed(2)} K/D.`,
      drill: "Write pistol plan, first rifle default, and retake rule for this map before next queue.",
      priority: weakMap.winRate <= 30 ? "high" : "medium",
    });
  }

  if (weakAgent && weakAgent.games >= 2 && (weakAgent.winRate <= 45 || weakAgent.acs < 190)) {
    cards.push({
      id: "agent-value",
      title: `Increase ${weakAgent.agent} value`,
      focus: "Make the agent pick produce repeatable early-round impact.",
      evidence: `${weakAgent.agent}: ${weakAgent.games} games, ${weakAgent.winRate.toFixed(0)}% WR, ${formatMetric(weakAgent.acs)} ACS.`,
      drill: "Prepare two opening plays and one defensive fallback setup for this agent.",
      priority: "medium",
    });
  }

  if (context.reviewActions?.length) {
    cards.push({
      id: "coach-action",
      title: "Finish assigned review action",
      focus: normalizeSentence(context.reviewActions[0]),
      evidence: `${context.reviewActions.length} open coach-assigned review action${context.reviewActions.length === 1 ? "" : "s"} attached to this player.`,
      drill: "Mark it done only after it shows up correctly in one match or scrim block.",
      priority: "high",
    });
  } else if (context.coachNotes?.length) {
    cards.push({
      id: "coach-note",
      title: "Apply coach note in game",
      focus: normalizeSentence(context.coachNotes[0]),
      evidence: coachContextEvidence(context),
      drill: "Pick one note and call it before pistol, bonus, and first full-buy round.",
      priority: "medium",
    });
  }

  cards.push({
    id: "comms",
    title: "Tighten mid-round comms",
    focus: "Call location, damage, utility, and next action in that order.",
    evidence: `${context.actLabel}: ${matches.length} match sample with ${summary.winRate.toFixed(0)}% win rate.`,
    drill: "After every death, say one useful next action instead of explaining the whole fight.",
    priority: summary.winRate < 45 ? "medium" : "low",
  });

  return dedupeCards(cards).slice(0, 3);
}

function summarize(matches: NormalizedMatch[]) {
  const sampleSize = matches.length || 1;
  const deaths = matches.reduce((sum, match) => sum + match.deaths, 0);
  const kills = matches.reduce((sum, match) => sum + match.kills, 0);
  const wins = matches.filter((match) => match.result === "win").length;
  const losses = matches.filter((match) => match.result === "loss").length;
  const decided = wins + losses || 1;

  return {
    sampleSize: matches.length,
    kd: kills / Math.max(1, deaths),
    hs: matches.reduce((sum, match) => sum + match.headshotPct, 0) / sampleSize,
    acs: average(matches.map((match) => validMetric(match.acs))),
    adr: average(matches.map((match) => validMetric(match.adr))),
    winRate: (wins / decided) * 100,
    lossRate: (losses / decided) * 100,
  };
}

function summarizeMaps(matches: NormalizedMatch[]) {
  const totals = new Map<string, { deaths: number; games: number; kills: number; wins: number }>();
  for (const match of matches) {
    const entry = totals.get(match.map) ?? { deaths: 0, games: 0, kills: 0, wins: 0 };
    entry.games += 1;
    entry.kills += match.kills;
    entry.deaths += match.deaths;
    if (match.result === "win") entry.wins += 1;
    totals.set(match.map, entry);
  }

  return [...totals.entries()]
    .map(([map, values]) => ({
      map,
      games: values.games,
      winRate: values.games ? (values.wins / values.games) * 100 : 0,
      kd: values.kills / Math.max(1, values.deaths),
    }))
    .sort((a, b) => {
      const aScore = a.winRate + Math.min(1.4, a.kd) * 20;
      const bScore = b.winRate + Math.min(1.4, b.kd) * 20;
      return aScore - bScore;
    });
}

function summarizeAgents(matches: NormalizedMatch[]) {
  const totals = new Map<string, { acs: number; acsCount: number; games: number; wins: number }>();
  for (const match of matches) {
    if (!match.agent) continue;
    const entry = totals.get(match.agent) ?? { acs: 0, acsCount: 0, games: 0, wins: 0 };
    entry.games += 1;
    if (match.result === "win") entry.wins += 1;
    const acs = validMetric(match.acs);
    if (acs !== null) {
      entry.acs += acs;
      entry.acsCount += 1;
    }
    totals.set(match.agent, entry);
  }

  return [...totals.entries()]
    .map(([agent, values]) => ({
      agent,
      games: values.games,
      winRate: values.games ? (values.wins / values.games) * 100 : 0,
      acs: values.acsCount ? values.acs / values.acsCount : 0,
    }))
    .sort((a, b) => {
      const aScore = a.winRate + a.acs / 5;
      const bScore = b.winRate + b.acs / 5;
      return aScore - bScore;
    });
}

function average(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null);
  if (valid.length === 0) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function validMetric(value: number) {
  return Number.isFinite(value) && value > 0 ? value : null;
}

function formatMetric(value: number) {
  return value > 0 ? value.toFixed(0) : "N/A";
}

function coachContextEvidence(context: PlayerImprovementContext) {
  const notes = context.coachNotes?.length ?? 0;
  const actions = context.reviewActions?.length ?? 0;
  if (actions > 0) return `${actions} open review action${actions === 1 ? "" : "s"} from coach review.`;
  if (notes > 0) return `${notes} recent team coach note${notes === 1 ? "" : "s"} available for context.`;
  return "No coach note context is attached yet.";
}

function normalizeSentence(value: string) {
  const clean = value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);
  if (!clean) return "Turn the latest coach feedback into one visible in-game habit.";
  return clean.endsWith(".") ? clean : `${clean}.`;
}

function dedupeCards(cards: PlayerImprovementCard[]) {
  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = card.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
