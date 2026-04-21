import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { henrikAccount, henrikMMR, henrikMatches } from "@/lib/henrik/client";
import {
  normalizeAccount,
  normalizeMatches,
  normalizeMMR,
} from "@/lib/henrik/normalize";
import { normalizeRegion } from "@/lib/henrik/regions";
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
      const [acct, mmr, matches] = await Promise.all([
        henrikAccount(p.riot_name, p.riot_tag, { force: true }),
        henrikMMR(p.riot_name, p.riot_tag, region, { force: true }),
        henrikMatches(p.riot_name, p.riot_tag, region, { force: true, size: 10 }),
      ]);
      const account = normalizeAccount(acct);
      const mmrN = normalizeMMR(mmr);
      const matchesN = normalizeMatches(matches, { puuid: p.puuid ?? account?.puuid });

      const kd =
        matchesN.length > 0
          ? matchesN.reduce(
              (a, m) => a + (m.deaths === 0 ? m.kills : m.kills / Math.max(1, m.deaths)),
              0,
            ) / matchesN.length
          : null;
      const acs =
        matchesN.length > 0
          ? matchesN.reduce((a, m) => a + m.acs, 0) / matchesN.length
          : null;
      const hs =
        matchesN.length > 0
          ? matchesN.reduce((a, m) => a + m.headshotPct, 0) / matchesN.length
          : null;
      const decided = matchesN.filter((m) => m.result === "win" || m.result === "loss");
      const wins = matchesN.filter((m) => m.result === "win").length;
      const wr = decided.length ? (wins / decided.length) * 100 : null;

      await admin
        .from("player_profiles")
        .update({
          puuid: p.puuid ?? account?.puuid ?? null,
          current_rank: mmrN?.currentTier ?? null,
          current_rr: mmrN?.currentRR ?? null,
          peak_rank: mmrN?.peakTier ?? null,
          headshot_pct: hs != null ? Number(hs.toFixed(2)) : null,
          kd_ratio: kd != null ? Number(kd.toFixed(3)) : null,
          acs: acs != null ? Number(acs.toFixed(2)) : null,
          win_rate: wr != null ? Number(wr.toFixed(2)) : null,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", p.id);

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
