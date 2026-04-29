import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MatchMomentRow, PlayerProfileRow, UserRow } from "@/types/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { team } = await requireSession();
    const limit = clamp(Number(request.nextUrl.searchParams.get("limit") ?? 40), 1, 80);
    const supabase = await createSupabaseServerClient();

    const { data: moments, error } = await supabase
      .from("match_moments")
      .select("*")
      .eq("team_id", team.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const rows = (moments ?? []) as MatchMomentRow[];
    const [userIds, profileIds] = [
      [...new Set(rows.map((moment) => moment.user_id).filter((id): id is string => Boolean(id)))],
      [...new Set(rows.map((moment) => moment.player_profile_id))],
    ];

    const [{ data: users }, { data: profiles }] = await Promise.all([
      userIds.length
        ? supabase.from("users").select("id, display_name, email, avatar_url").in("id", userIds)
        : Promise.resolve({ data: [] }),
      profileIds.length
        ? supabase
            .from("player_profiles")
            .select("id, riot_name, riot_tag, current_rank, current_rr")
            .in("id", profileIds)
        : Promise.resolve({ data: [] }),
    ]);

    const usersById = new Map(((users ?? []) as Partial<UserRow>[]).map((user) => [user.id, user]));
    const profilesById = new Map(
      ((profiles ?? []) as Partial<PlayerProfileRow>[]).map((profile) => [profile.id, profile]),
    );

    return NextResponse.json({
      data: rows.map((moment) => ({
        ...moment,
        actor: moment.user_id ? usersById.get(moment.user_id) ?? null : null,
        profile: profilesById.get(moment.player_profile_id) ?? null,
      })),
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
