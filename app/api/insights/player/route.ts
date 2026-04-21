import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { henrikAccount, henrikMatches, henrikMMR, henrikMmrHistory } from "@/lib/henrik/client";
import {
  normalizeAccount,
  normalizeMatches,
  normalizeMMR,
  normalizeMmrHistory,
} from "@/lib/henrik/normalize";
import { defaultRegion, normalizeRegion } from "@/lib/henrik/regions";
import { runEngine } from "@/lib/insights/engine";
import { enhanceWithLLM } from "@/lib/insights/llm";
import { AI_PREDICTION_TTL_MS } from "@/lib/constants";

export const runtime = "nodejs";

const Payload = z.object({
  name: z.string().min(1),
  tag: z.string().min(1),
  region: z.string().optional(),
  force: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = Payload.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const region = normalizeRegion(body.region ?? defaultRegion());
  const admin = createSupabaseAdminClient();

  // Resolve / upsert player profile
  const accountRes = await henrikAccount(body.name, body.tag);
  const account = normalizeAccount(accountRes);
  if (!account) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const { data: existingProfile } = await admin
    .from("player_profiles")
    .select("*")
    .eq("riot_name", account.name)
    .eq("riot_tag", account.tag)
    .maybeSingle();

  // Return cached prediction if fresh and not forced
  if (!body.force && existingProfile?.id) {
    const { data: cached } = await admin
      .from("ai_predictions")
      .select("*")
      .eq("player_profile_id", existingProfile.id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (
      cached &&
      new Date(cached.generated_at as string).getTime() > Date.now() - AI_PREDICTION_TTL_MS
    ) {
      return NextResponse.json({ data: cached, cached: true });
    }
  }

  const [mmrRes, matchesRes, historyRes] = await Promise.all([
    henrikMMR(account.name, account.tag, region),
    henrikMatches(account.name, account.tag, region, { size: 20 }),
    henrikMmrHistory(account.name, account.tag, region),
  ]);

  const mmr = normalizeMMR(mmrRes);
  const matches = normalizeMatches(matchesRes, { puuid: account.puuid });
  const history = normalizeMmrHistory(historyRes);

  const engine = runEngine({
    matches,
    mmrHistory: history,
    currentRank: mmr?.currentTier ?? null,
    currentRR: mmr?.currentRR ?? null,
  });

  const llm = await enhanceWithLLM({
    player: { name: account.name, tag: account.tag, currentRank: mmr?.currentTier ?? null },
    engine,
  });

  // Upsert profile
  const { data: profile } = await admin
    .from("player_profiles")
    .upsert(
      {
        riot_name: account.name,
        riot_tag: account.tag,
        region,
        puuid: account.puuid,
        team_id: session.team.id,
        current_rank: mmr?.currentTier ?? null,
        current_rr: mmr?.currentRR ?? null,
        peak_rank: mmr?.peakTier ?? null,
        headshot_pct: typeof engine.dataPoints.hsPctMean === "number" ? engine.dataPoints.hsPctMean : null,
        kd_ratio: typeof engine.dataPoints.kdMean === "number" ? engine.dataPoints.kdMean : null,
        acs: typeof engine.dataPoints.acsMean === "number" ? engine.dataPoints.acsMean : null,
        win_rate: Number((engine.winRate * 100).toFixed(2)),
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "riot_name,riot_tag" },
    )
    .select("*")
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Failed to persist profile" }, { status: 500 });
  }

  const insertRow = {
    player_profile_id: profile.id,
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
  };

  const { data: saved } = await admin
    .from("ai_predictions")
    .insert(insertRow)
    .select("*")
    .maybeSingle();

  return NextResponse.json({ data: saved ?? insertRow, cached: false });
}
