import type {
  AiPredictionRow,
  NormalizedMatch,
  PlayerProfileRow,
  Result,
  TrackedStatRow,
} from "@/types/domain";

const TEAM_SAMPLE_LIMIT = 10;
const FORM_WINDOW = 5;
const FRESH_SYNC_WINDOW_MS = 48 * 60 * 60 * 1000;

export interface MatchStatSample {
  playedAt: string | null;
  map: string | null;
  agent: string | null;
  mode: string | null;
  result: Result | null;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  acs: number | null;
  adr: number | null;
  headshotPct: number | null;
}

export interface PlayerStatSnapshot {
  sampleSize: number;
  source: "tracked_stats" | "profile";
  lastMatchAt: string | null;
  recentWinRate: number | null;
  momentumPct: number | null;
  metrics: {
    kdRatio: number | null;
    acs: number | null;
    headshotPct: number | null;
    winRate: number | null;
    killsPerMatch: number | null;
    deathsPerMatch: number | null;
    assistsPerMatch: number | null;
    adr: number | null;
  };
}

export interface TeamStatLeader {
  playerProfileId: string;
  riotName: string;
  riotTag: string;
  value: number;
  sampleSize: number;
  source: "tracked_stats" | "profile";
}

export interface TeamStatsBundle {
  teamId: string | null;
  players: Array<{
    profile: PlayerProfileRow;
    prediction: AiPredictionRow | null;
    sampleSize: number;
    source: "tracked_stats" | "profile";
    lastMatchAt: string | null;
    recentWinRate: number | null;
    momentumPct: number | null;
    metrics: PlayerStatSnapshot["metrics"];
  }>;
  overview: {
    rosterLinkedCount: number;
    trackedProfiles: number;
    playersWithSamples: number;
    sampledMatches: number;
    syncedRecently: number;
    coveragePct: number | null;
    lastSyncAt: string | null;
  };
  averages: {
    headshot_pct: number | null;
    kd_ratio: number | null;
    acs: number | null;
    win_rate: number | null;
  };
  combat: {
    kills_per_match: number | null;
    deaths_per_match: number | null;
    assists_per_match: number | null;
    adr: number | null;
  };
  trend: {
    recent_win_rate: number | null;
    momentum_pct: number | null;
  };
  leaders: {
    acs: TeamStatLeader | null;
    kd_ratio: TeamStatLeader | null;
    headshot_pct: TeamStatLeader | null;
    win_rate: TeamStatLeader | null;
  };
  agentPool: Array<{
    agent: string;
    games: number;
    winRate: number;
    acs: number | null;
  }>;
}

export function trackedStatToMatchSample(row: TrackedStatRow): MatchStatSample {
  return {
    playedAt: row.played_at,
    map: row.map,
    agent: row.agent,
    mode: row.mode,
    result: row.result,
    kills: row.kills,
    deaths: row.deaths,
    assists: row.assists,
    acs: row.acs,
    adr: row.adr,
    headshotPct: row.headshot_pct,
  };
}

export function normalizedMatchToMatchSample(match: NormalizedMatch): MatchStatSample {
  return {
    playedAt: match.startedAt,
    map: match.map,
    agent: match.agent,
    mode: match.mode,
    result: match.result,
    kills: match.kills,
    deaths: match.deaths,
    assists: match.assists,
    acs: match.acs,
    adr: match.adr,
    headshotPct: match.headshotPct,
  };
}

export function buildPlayerStatSnapshot(
  matches: MatchStatSample[],
  fallback?: Pick<PlayerProfileRow, "headshot_pct" | "kd_ratio" | "acs" | "win_rate"> | null,
): PlayerStatSnapshot {
  const sample = [...matches]
    .sort((a, b) => parseTime(b.playedAt) - parseTime(a.playedAt))
    .slice(0, TEAM_SAMPLE_LIMIT);

  const kds = sample
    .map((m) => matchKDRatio(m.kills, m.deaths))
    .filter((value): value is number => isFiniteNumber(value));
  const acs = sample.map((m) => m.acs).filter(isFiniteNumber);
  const hs = sample.map((m) => m.headshotPct).filter(isFiniteNumber);
  const kills = sample.map((m) => m.kills).filter(isFiniteNumber);
  const deaths = sample.map((m) => m.deaths).filter(isFiniteNumber);
  const assists = sample.map((m) => m.assists).filter(isFiniteNumber);
  const adr = sample.map((m) => m.adr).filter(isFiniteNumber);

  const decided = sample.filter((m) => m.result === "win" || m.result === "loss");
  const wins = decided.filter((m) => m.result === "win").length;
  const recentDecided = sample
    .slice(0, FORM_WINDOW)
    .filter((m) => m.result === "win" || m.result === "loss");
  const recentWins = recentDecided.filter((m) => m.result === "win").length;

  const olderWindow = Math.min(
    FORM_WINDOW,
    Math.floor(sample.length / 2),
  );
  const momentumPct =
    olderWindow >= 2
      ? diffPct(
          avgOrNull(sample.slice(0, olderWindow).map((m) => m.acs).filter(isFiniteNumber)),
          avgOrNull(
            sample
              .slice(olderWindow, olderWindow * 2)
              .map((m) => m.acs)
              .filter(isFiniteNumber),
          ),
        )
      : null;

  return {
    sampleSize: sample.length,
    source: sample.length > 0 ? "tracked_stats" : "profile",
    lastMatchAt: sample[0]?.playedAt ?? null,
    recentWinRate: recentDecided.length
      ? round((recentWins / recentDecided.length) * 100, 2)
      : null,
    momentumPct,
    metrics: {
      kdRatio: metricOrFallback(avgOrNull(kds), fallback?.kd_ratio ?? null, 3),
      acs: metricOrFallback(avgOrNull(acs), fallback?.acs ?? null, 2),
      headshotPct: metricOrFallback(avgOrNull(hs), fallback?.headshot_pct ?? null, 2),
      winRate: metricOrFallback(
        decided.length ? (wins / decided.length) * 100 : null,
        fallback?.win_rate ?? null,
        2,
      ),
      killsPerMatch: avgOrNull(kills, 2),
      deathsPerMatch: avgOrNull(deaths, 2),
      assistsPerMatch: avgOrNull(assists, 2),
      adr: avgOrNull(adr, 2),
    },
  };
}

export function buildTeamStatsBundle({
  teamId,
  profiles,
  trackedStats,
  predictions = [],
  rosterLinkedCount,
}: {
  teamId: string | null;
  profiles: PlayerProfileRow[];
  trackedStats: TrackedStatRow[];
  predictions?: AiPredictionRow[];
  rosterLinkedCount: number;
}): TeamStatsBundle {
  const latestPredictions = new Map<string, AiPredictionRow>();
  for (const row of [...predictions].sort(
    (a, b) => parseTime(b.generated_at) - parseTime(a.generated_at),
  )) {
    if (!latestPredictions.has(row.player_profile_id)) {
      latestPredictions.set(row.player_profile_id, row);
    }
  }

  const samplesByPlayer = new Map<string, MatchStatSample[]>();
  for (const row of trackedStats) {
    if (!row.player_profile_id) continue;
    const bucket = samplesByPlayer.get(row.player_profile_id) ?? [];
    bucket.push(trackedStatToMatchSample(row));
    samplesByPlayer.set(row.player_profile_id, bucket);
  }

  const playersWithSamples = profiles.map((profile) => {
    const samples = samplesByPlayer.get(profile.id) ?? [];
    const snapshot = buildPlayerStatSnapshot(samples, profile);

    return {
      profile,
      prediction: latestPredictions.get(profile.id) ?? null,
      sampleMatches: [...samples]
        .sort((a, b) => parseTime(b.playedAt) - parseTime(a.playedAt))
        .slice(0, TEAM_SAMPLE_LIMIT),
      ...snapshot,
    };
  });

  const players = playersWithSamples.map(({ sampleMatches: _sampleMatches, ...player }) => player);
  const metricValues = <K extends keyof PlayerStatSnapshot["metrics"]>(key: K) =>
    players
      .map((player) => player.metrics[key])
      .filter((value): value is number => isFiniteNumber(value));

  const lastSyncAt = profiles
    .map((profile) => profile.last_synced_at)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => parseTime(b) - parseTime(a))[0] ?? null;

  const recentMatchSamples = playersWithSamples.flatMap((player) => player.sampleMatches);
  const byAgent = new Map<string, { games: number; wins: number; acs: number[] }>();
  for (const match of recentMatchSamples) {
    if (!match.agent) continue;
    const bucket = byAgent.get(match.agent) ?? { games: 0, wins: 0, acs: [] };
    bucket.games += 1;
    if (match.result === "win") bucket.wins += 1;
    if (isFiniteNumber(match.acs)) bucket.acs.push(match.acs);
    byAgent.set(match.agent, bucket);
  }

  return {
    teamId,
    players,
    overview: {
      rosterLinkedCount,
      trackedProfiles: profiles.length,
      playersWithSamples: players.filter((player) => player.sampleSize > 0).length,
      sampledMatches: players.reduce((sum, player) => sum + player.sampleSize, 0),
      syncedRecently: profiles.filter(
        (profile) =>
          profile.last_synced_at &&
          Date.now() - parseTime(profile.last_synced_at) <= FRESH_SYNC_WINDOW_MS,
      ).length,
      coveragePct:
        rosterLinkedCount > 0 ? round((profiles.length / rosterLinkedCount) * 100, 1) : null,
      lastSyncAt,
    },
    averages: {
      headshot_pct: avgOrNull(metricValues("headshotPct"), 2),
      kd_ratio: avgOrNull(metricValues("kdRatio"), 3),
      acs: avgOrNull(metricValues("acs"), 2),
      win_rate: avgOrNull(metricValues("winRate"), 2),
    },
    combat: {
      kills_per_match: avgOrNull(metricValues("killsPerMatch"), 2),
      deaths_per_match: avgOrNull(metricValues("deathsPerMatch"), 2),
      assists_per_match: avgOrNull(metricValues("assistsPerMatch"), 2),
      adr: avgOrNull(metricValues("adr"), 2),
    },
    trend: {
      recent_win_rate: avgOrNull(
        players.map((player) => player.recentWinRate).filter(isFiniteNumber),
        2,
      ),
      momentum_pct: avgOrNull(
        players.map((player) => player.momentumPct).filter(isFiniteNumber),
        2,
      ),
    },
    leaders: {
      acs: leaderFor(players, (player) => player.metrics.acs, 2),
      kd_ratio: leaderFor(players, (player) => player.metrics.kdRatio, 3),
      headshot_pct: leaderFor(players, (player) => player.metrics.headshotPct, 2),
      win_rate: leaderFor(players, (player) => player.metrics.winRate, 2),
    },
    agentPool: [...byAgent.entries()]
      .map(([agent, value]) => ({
        agent,
        games: value.games,
        winRate: round((value.wins / value.games) * 100, 2),
        acs: avgOrNull(value.acs, 2),
      }))
      .sort((a, b) => b.games - a.games || b.winRate - a.winRate || (b.acs ?? 0) - (a.acs ?? 0))
      .slice(0, 5),
  };
}

function leaderFor(
  players: TeamStatsBundle["players"],
  select: (player: TeamStatsBundle["players"][number]) => number | null,
  digits: number,
): TeamStatLeader | null {
  const ranked = players
    .map((player) => ({ player, value: select(player) }))
    .filter((entry): entry is { player: TeamStatsBundle["players"][number]; value: number } =>
      isFiniteNumber(entry.value),
    )
    .sort((a, b) => b.value - a.value || b.player.sampleSize - a.player.sampleSize);

  const top = ranked[0];
  if (!top) return null;

  return {
    playerProfileId: top.player.profile.id,
    riotName: top.player.profile.riot_name,
    riotTag: top.player.profile.riot_tag,
    value: round(top.value, digits),
    sampleSize: top.player.sampleSize,
    source: top.player.source,
  };
}

function matchKDRatio(kills: number | null, deaths: number | null): number | null {
  if (!isFiniteNumber(kills) || !isFiniteNumber(deaths)) return null;
  if (deaths === 0) return kills;
  return kills / deaths;
}

function metricOrFallback(
  value: number | null,
  fallback: number | null,
  digits: number,
): number | null {
  if (isFiniteNumber(value)) return round(value, digits);
  if (isFiniteNumber(fallback)) return round(fallback, digits);
  return null;
}

function avgOrNull(values: number[], digits = 2): number | null {
  if (values.length === 0) return null;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length, digits);
}

function diffPct(recent: number | null, older: number | null): number | null {
  if (!isFiniteNumber(recent) || !isFiniteNumber(older) || older === 0) return null;
  return round(((recent - older) / older) * 100, 2);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseTime(value: string | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function round(value: number, digits: number): number {
  const power = 10 ** digits;
  return Math.round(value * power) / power;
}
