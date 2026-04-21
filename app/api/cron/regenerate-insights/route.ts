import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { henrikMMR, henrikMatches, henrikMmrHistory } from "@/lib/henrik/client";
import {
  normalizeMatches,
  normalizeMMR,
  normalizeMmrHistory,
} from "@/lib/henrik/normalize";
import { normalizeRegion } from "@/lib/henrik/regions";
import { runEngine } from "@/lib/insights/engine";
import { enhanceWithLLM } from "@/lib/insights/llm";
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
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const p of list) {
    try {
      const region = normalizeRegion(p.region ?? "eu");
      const [mmr, matches, history] = await Promise.all([
        henrikMMR(p.riot_name, p.riot_tag, region),
        henrikMatches(p.riot_name, p.riot_tag, region, { size: 20 }),
        henrikMmrHistory(p.riot_name, p.riot_tag, region),
      ]);
      const mmrN = normalizeMMR(mmr);
      const matchesN = normalizeMatches(matches, { puuid: p.puuid });
      const historyN = normalizeMmrHistory(history);

      const engine = runEngine({
        matches: matchesN,
        mmrHistory: historyN,
        currentRank: mmrN?.currentTier ?? null,
        currentRR: mmrN?.currentRR ?? null,
      });
      const llm = await enhanceWithLLM({
        player: { name: p.riot_name, tag: p.riot_tag, currentRank: mmrN?.currentTier ?? null },
        engine,
      });

      await admin.from("ai_predictions").insert({
        player_profile_id: p.id,
        predicted_rank: engine.predictedRank,
        predicted_rank_low: engine.predictedRankLow,
        predicted_rank_high: engine.predictedRankHigh,
        confidence: engine.confidence,
        momentum: engine.momentum,
        consistency: engine.consistency,
        rr_trend: engine.rrTrend,
        win_rate: Number((engine.winRate * 100).toFixed(2)),
        strengths: engine.strengths,
        weaknesses: engine.weaknesses,
        best_agents: engine.bestAgents,
        weak_maps: engine.weakMaps,
        improvement_suggestions: llm.improvementSuggestions,
        reasoning: llm.reasoning,
        engine_version: "v1",
        data_points: engine.dataPoints,
        llm_used: llm.used,
      });

      results.push({ id: p.id, ok: true });
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
