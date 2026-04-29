import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildMatchMoment } from "@/lib/stats/match-moments";
import type { MatchMomentRow, NormalizedMatch, PlayerProfileRow } from "@/types/domain";

interface CreateMatchMomentsInput {
  teamId: string;
  userId: string | null;
  playerName: string;
  profile: PlayerProfileRow;
  matches: NormalizedMatch[];
  since: Date;
}

export async function createMatchMomentsForProfile({
  matches,
  playerName,
  profile,
  since,
  teamId,
  userId,
}: CreateMatchMomentsInput): Promise<MatchMomentRow[]> {
  const candidates = matches.filter((match) => {
    const playedAt = new Date(match.startedAt).getTime();
    return match.matchId && Number.isFinite(playedAt) && playedAt >= since.getTime();
  });

  if (candidates.length === 0) return [];

  const admin = createSupabaseAdminClient();
  const matchIds = candidates.map((match) => match.matchId);
  const { data: existing, error: existingError } = await admin
    .from("match_moments")
    .select("match_id")
    .eq("player_profile_id", profile.id)
    .in("match_id", matchIds);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingIds = new Set((existing ?? []).map((row) => String(row.match_id)));
  const rows = candidates
    .filter((match) => !existingIds.has(match.matchId))
    .map((match) => {
      const moment = buildMatchMoment({
        playerName,
        matchId: match.matchId,
        result: match.result,
        map: match.map,
        agent: match.agent,
        scoreTeam: match.scoreTeam,
        scoreOpponent: match.scoreOpponent,
        kills: match.kills,
        deaths: match.deaths,
        assists: match.assists,
        acs: match.acs,
        adr: match.adr,
        headshotPct: match.headshotPct,
        rankAfter: match.rankAfter,
        rrChange: match.rrChange,
        startedAt: match.startedAt,
      });

      return {
        team_id: teamId,
        user_id: userId,
        player_profile_id: profile.id,
        match_id: match.matchId,
        label: moment.label,
        title: moment.title,
        subtitle: moment.subtitle,
        severity: moment.severity,
        sound: moment.sound,
        performance_index: moment.performanceIndex,
        stats: moment.stats,
        payload: {
          agent: match.agent,
          map: match.map,
          mode: match.mode,
          rank_after: match.rankAfter,
          rr_change: match.rrChange,
          raw_match: match.raw,
        },
        played_at: match.startedAt,
      };
    });

  if (rows.length === 0) return [];

  const { data, error } = await admin
    .from("match_moments")
    .insert(rows)
    .select("*")
    .order("played_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MatchMomentRow[];
}
