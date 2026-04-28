import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { henrikAccount, henrikMatches, henrikMMR } from "@/lib/henrik/client";
import {
  normalizeAccount,
  normalizeMatches,
  normalizeMMR,
} from "@/lib/henrik/normalize";
import { normalizeRegion } from "@/lib/henrik/regions";
import {
  buildPlayerStatSnapshot,
  normalizedMatchToMatchSample,
} from "@/lib/stats/team";
import type { PlayerProfileRow } from "@/types/domain";

interface SyncPlayerProfileInput {
  profile?: PlayerProfileRow | null;
  userId?: string | null;
  teamId: string;
  riotName: string;
  riotTag: string;
  region?: string | null;
  force?: boolean;
  matchLimit?: number;
}

export interface SyncPlayerProfileResult {
  profile: PlayerProfileRow;
  matchCount: number;
  refreshedRank: boolean;
  refreshedMatches: boolean;
}

export async function syncPlayerProfileFromHenrik({
  force = false,
  matchLimit = 20,
  profile,
  region: requestedRegion,
  riotName,
  riotTag,
  teamId,
  userId,
}: SyncPlayerProfileInput): Promise<SyncPlayerProfileResult> {
  const admin = createSupabaseAdminClient();
  const region = normalizeRegion(requestedRegion ?? profile?.region ?? "eu");
  const name = riotName.trim();
  const tag = riotTag.trim().replace(/^#/, "");

  const account = normalizeAccount(await henrikAccount(name, tag, { force }));
  if (!account) {
    throw new Error(`Riot account not found for ${name}#${tag}`);
  }

  const [mmrResult, matchesResult] = await Promise.allSettled([
    henrikMMR(account.name, account.tag, region, { force }),
    henrikMatches(account.name, account.tag, region, { force, size: matchLimit }),
  ]);

  const mmr = mmrResult.status === "fulfilled" ? normalizeMMR(mmrResult.value) : null;
  const matches =
    matchesResult.status === "fulfilled"
      ? normalizeMatches(matchesResult.value, {
          puuid: account.puuid,
          name: account.name,
          tag: account.tag,
        })
      : [];
  const refreshedRank = mmrResult.status === "fulfilled";
  const refreshedMatches = matchesResult.status === "fulfilled";
  const snapshot = buildPlayerStatSnapshot(
    matches.map(normalizedMatchToMatchSample),
    profile,
  );
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("player_profiles")
    .upsert(
      {
        user_id: userId ?? profile?.user_id ?? null,
        team_id: teamId,
        riot_name: account.name,
        riot_tag: account.tag,
        region,
        puuid: account.puuid,
        current_rank: refreshedRank ? mmr?.currentTier ?? null : profile?.current_rank ?? null,
        current_rr: refreshedRank ? mmr?.currentRR ?? null : profile?.current_rr ?? null,
        peak_rank: refreshedRank ? mmr?.peakTier ?? null : profile?.peak_rank ?? null,
        peak_rr: refreshedRank ? mmr?.peakRR ?? null : profile?.peak_rr ?? null,
        headshot_pct: refreshedMatches
          ? snapshot.metrics.headshotPct
          : profile?.headshot_pct ?? null,
        kd_ratio: refreshedMatches ? snapshot.metrics.kdRatio : profile?.kd_ratio ?? null,
        acs: refreshedMatches ? snapshot.metrics.acs : profile?.acs ?? null,
        win_rate: refreshedMatches ? snapshot.metrics.winRate : profile?.win_rate ?? null,
        last_synced_at: refreshedRank || refreshedMatches ? now : profile?.last_synced_at ?? now,
      },
      { onConflict: "riot_name,riot_tag" },
    )
    .select("*")
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Profile sync failed");
  }

  const syncedProfile = data as PlayerProfileRow;
  const trackedRows = matches.map((match) => ({
    player_profile_id: syncedProfile.id,
    match_id: match.matchId,
    played_at: match.startedAt,
    map: match.map,
    agent: match.agent,
    mode: match.mode,
    result: match.result,
    score_team: match.scoreTeam,
    score_opponent: match.scoreOpponent,
    kills: match.kills,
    deaths: match.deaths,
    assists: match.assists,
    acs: match.acs,
    adr: match.adr,
    headshot_pct: match.headshotPct,
    rr_change: match.rrChange,
    rank_after: match.rankAfter,
    raw: match.raw,
  }));

  if (trackedRows.length > 0) {
    const { error: trackedError } = await admin
      .from("tracked_stats")
      .upsert(trackedRows, { onConflict: "player_profile_id,match_id" });
    if (trackedError) {
      throw new Error(trackedError.message);
    }
  }

  return {
    profile: syncedProfile,
    matchCount: trackedRows.length,
    refreshedRank,
    refreshedMatches,
  };
}
