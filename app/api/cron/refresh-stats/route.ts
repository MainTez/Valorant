import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { henrikAccount, henrikMMR, henrikMatches } from "@/lib/henrik/client";
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data: profiles } = await admin
    .from("player_profiles")
    .select("*")
    .not("team_id", "is", null);

  const list = (profiles ?? []) as PlayerProfileRow[];
  const results: Array<{ id: string; ok: boolean; matches?: number; error?: string }> = [];

  for (const p of list) {
    try {
      const region = normalizeRegion(p.region ?? "eu");
      const [acct, mmr, matches] = await Promise.all([
        henrikAccount(p.riot_name, p.riot_tag, { force: true }),
        henrikMMR(p.riot_name, p.riot_tag, region, { force: true }),
        henrikMatches(p.riot_name, p.riot_tag, region, { force: true, size: 20 }),
      ]);
      const account = normalizeAccount(acct);
      const mmrN = normalizeMMR(mmr);
      const matchesN = normalizeMatches(matches, { puuid: account?.puuid ?? p.puuid });
      const snapshot = buildPlayerStatSnapshot(
        matchesN.map(normalizedMatchToMatchSample),
        p,
      );
      const trackedRows = matchesN.map((match) => ({
        player_profile_id: p.id,
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
        if (trackedError) throw trackedError;
      }

      const { error: updateError } = await admin
        .from("player_profiles")
        .update({
          puuid: account?.puuid ?? p.puuid ?? null,
          current_rank: mmrN?.currentTier ?? null,
          current_rr: mmrN?.currentRR ?? null,
          peak_rank: mmrN?.peakTier ?? null,
          headshot_pct: snapshot.metrics.headshotPct,
          kd_ratio: snapshot.metrics.kdRatio,
          acs: snapshot.metrics.acs,
          win_rate: snapshot.metrics.winRate,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", p.id);
      if (updateError) throw updateError;

      results.push({ id: p.id, ok: true, matches: trackedRows.length });
    } catch (err) {
      results.push({
        id: p.id,
        ok: false,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return NextResponse.json({
    refreshed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
