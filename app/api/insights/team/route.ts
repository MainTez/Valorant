import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AiPredictionRow, PlayerProfileRow } from "@/types/domain";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  const { data: profiles } = await supabase
    .from("player_profiles")
    .select("*")
    .eq("team_id", session.team.id);

  const list = (profiles ?? []) as PlayerProfileRow[];
  if (list.length === 0) {
    return NextResponse.json({
      data: {
        teamId: session.team.id,
        players: [],
        averages: null,
      },
    });
  }

  const ids = list.map((p) => p.id);
  const { data: predRows } = await supabase
    .from("ai_predictions")
    .select("*")
    .in("player_profile_id", ids)
    .order("generated_at", { ascending: false });

  const byPlayer = new Map<string, AiPredictionRow>();
  for (const r of (predRows ?? []) as AiPredictionRow[]) {
    if (!byPlayer.has(r.player_profile_id)) byPlayer.set(r.player_profile_id, r);
  }

  const players = list.map((p) => ({
    profile: p,
    prediction: byPlayer.get(p.id) ?? null,
  }));

  const nums = (key: keyof PlayerProfileRow) =>
    list
      .map((p) => (p[key] as number | null) ?? null)
      .filter((v): v is number => typeof v === "number");

  const avg = (arr: number[]) =>
    arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : null;

  const averages = {
    headshot_pct: avg(nums("headshot_pct")),
    kd_ratio: avg(nums("kd_ratio")),
    acs: avg(nums("acs")),
    win_rate: avg(nums("win_rate")),
  };

  return NextResponse.json({
    data: { teamId: session.team.id, players, averages },
  });
}
