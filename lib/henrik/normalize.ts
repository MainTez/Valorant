import type {
  NormalizedAccount,
  NormalizedMMR,
  NormalizedMatch,
  NormalizedMmrHistoryEntry,
  Result,
} from "@/types/domain";
import type {
  HenrikAccountResponse,
  HenrikMMRResponse,
  HenrikMatchResponse,
  HenrikMmrHistoryResponse,
  HenrikMatchPlayer,
} from "./types";

export function normalizeAccount(res: HenrikAccountResponse): NormalizedAccount | null {
  const d = res.data;
  if (!d) return null;
  return {
    puuid: d.puuid,
    name: d.name,
    tag: d.tag,
    region: d.region,
    accountLevel: d.account_level ?? null,
    cardUrl: d.card?.wide ?? d.card?.large ?? d.card?.small ?? null,
    updatedAt: d.last_update ?? new Date().toISOString(),
  };
}

export function normalizeMMR(res: HenrikMMRResponse): NormalizedMMR | null {
  const d = res.data;
  if (!d) return null;
  const cur = d.current_data ?? {};
  const high = d.highest_rank ?? {};
  return {
    currentTier: cur.currenttierpatched ?? null,
    currentTierId: cur.currenttier ?? null,
    currentRR: cur.ranking_in_tier ?? null,
    peakTier: high.patched_tier ?? null,
    peakRR: null,
    leaderboardPlace: cur.leaderboard_rank ?? null,
  };
}

function pickPlayer(players: HenrikMatchPlayer[] | undefined, puuid?: string | null, name?: string, tag?: string): HenrikMatchPlayer | null {
  if (!players) return null;
  if (puuid) {
    const byPuuid = players.find((p) => p.puuid === puuid);
    if (byPuuid) return byPuuid;
  }
  if (name && tag) {
    const byNameTag = players.find(
      (p) =>
        p.name?.toLowerCase() === name.toLowerCase() &&
        p.tag?.toLowerCase() === tag.toLowerCase(),
    );
    if (byNameTag) return byNameTag;
  }
  return null;
}

type HenrikMatch = NonNullable<HenrikMatchResponse["data"]>[number];

function resultFor(match: HenrikMatch, playerTeam: string | undefined): Result | null {
  if (!playerTeam) return null;
  const teamKey = playerTeam.toLowerCase() as "red" | "blue";
  const t = match.teams?.[teamKey];
  if (!t) return null;
  if (t.has_won === true) return "win";
  if (t.has_won === false) {
    // Check draw: both rounds equal
    const otherKey = teamKey === "red" ? "blue" : "red";
    const other = match.teams?.[otherKey];
    if (
      other &&
      typeof t.rounds_won === "number" &&
      typeof other.rounds_won === "number" &&
      t.rounds_won === other.rounds_won
    ) {
      return "draw";
    }
    return "loss";
  }
  return null;
}

export function normalizeMatches(
  res: HenrikMatchResponse,
  identity: { puuid?: string | null; name?: string; tag?: string } = {},
): NormalizedMatch[] {
  const arr = res.data ?? [];
  return arr
    .map((m): NormalizedMatch | null => {
      const meta = m.metadata ?? {};
      const player = pickPlayer(m.players?.all_players, identity.puuid, identity.name, identity.tag);
      if (!player) return null;
      const stats = player.stats ?? {};
      const rounds = player.rounds_played ?? meta.rounds_played ?? 0;
      const kills = stats.kills ?? 0;
      const deaths = stats.deaths ?? 0;
      const assists = stats.assists ?? 0;
      const bodyshots = stats.bodyshots ?? 0;
      const headshots = stats.headshots ?? 0;
      const legshots = stats.legshots ?? 0;
      const totalShots = bodyshots + headshots + legshots;
      const hsPct = totalShots > 0 ? (headshots / totalShots) * 100 : 0;
      const score = stats.score ?? 0;
      const acs = rounds > 0 ? Math.round(score / rounds) : 0;
      const adr = rounds > 0 && player.damage_made ? Math.round(player.damage_made / rounds) : 0;

      const teamKey = (player.team || "").toLowerCase() as "red" | "blue";
      const meTeam = m.teams?.[teamKey];
      const otherTeam = m.teams?.[teamKey === "red" ? "blue" : "red"];
      const result = resultFor(m, player.team);

      const startedAt = meta.game_start
        ? new Date(meta.game_start * 1000).toISOString()
        : new Date().toISOString();

      return {
        matchId: meta.matchid ?? cryptoId(),
        startedAt,
        map: meta.map ?? "Unknown",
        mode: meta.mode ?? meta.queue ?? "unrated",
        agent: player.character ?? null,
        result,
        scoreTeam: meTeam?.rounds_won ?? 0,
        scoreOpponent: otherTeam?.rounds_won ?? 0,
        kills,
        deaths,
        assists,
        acs,
        adr,
        headshotPct: Number(hsPct.toFixed(2)),
        rrChange: null,
        rankAfter: player.currenttier_patched ?? null,
        raw: m,
      };
    })
    .filter((m): m is NormalizedMatch => m !== null);
}

export function normalizeMmrHistory(
  res: HenrikMmrHistoryResponse,
): NormalizedMmrHistoryEntry[] {
  const arr = res.data ?? [];
  return arr.map((row) => ({
    date: row.date ?? new Date((row.date_raw ?? 0) * 1000).toISOString(),
    currentTier: row.currenttier_patched ?? null,
    tierId: row.currenttier ?? null,
    rrChange: row.mmr_change_to_last_game ?? 0,
    elo: row.elo ?? null,
    map: row.map?.name ?? null,
  }));
}

function cryptoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `m_${Math.random().toString(36).slice(2)}`;
}
