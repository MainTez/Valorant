import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncPlayerProfileFromHenrik } from "@/lib/stats/player-profile-sync";
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
      if (!p.team_id) throw new Error("Profile is missing team_id");
      const result = await syncPlayerProfileFromHenrik({
        profile: p,
        userId: p.user_id,
        teamId: p.team_id,
        riotName: p.riot_name,
        riotTag: p.riot_tag,
        region: p.region,
        force: true,
      });

      results.push({ id: result.profile.id, ok: true, matches: result.matchCount });
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
