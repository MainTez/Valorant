import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildTeamStatsBundle } from "@/lib/stats/team";
import type {
  AiPredictionRow,
  PlayerProfileRow,
  TrackedStatRow,
  UserRow,
} from "@/types/domain";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  const [{ data: profiles }, { data: members }] = await Promise.all([
    supabase
      .from("player_profiles")
      .select("*")
      .eq("team_id", session.team.id),
    supabase
      .from("users")
      .select("riot_name, riot_tag")
      .eq("team_id", session.team.id),
  ]);

  const list = (profiles ?? []) as PlayerProfileRow[];
  const rosterLinkedCount = ((members ?? []) as Array<Partial<UserRow>>).filter(
    (member) => member.riot_name && member.riot_tag,
  ).length;
  const ids = list.map((profile) => profile.id);

  const [{ data: predRows }, { data: trackedRows }] = ids.length
    ? await Promise.all([
        supabase
          .from("ai_predictions")
          .select("*")
          .in("player_profile_id", ids)
          .order("generated_at", { ascending: false }),
        supabase
          .from("tracked_stats")
          .select("*")
          .in("player_profile_id", ids)
          .order("played_at", { ascending: false }),
      ])
    : [
        { data: [] as AiPredictionRow[] },
        { data: [] as TrackedStatRow[] },
      ];

  const teamStats = buildTeamStatsBundle({
    teamId: session.team.id,
    profiles: list,
    trackedStats: (trackedRows ?? []) as TrackedStatRow[],
    predictions: (predRows ?? []) as AiPredictionRow[],
    rosterLinkedCount,
  });

  return NextResponse.json({
    data: teamStats,
  });
}
