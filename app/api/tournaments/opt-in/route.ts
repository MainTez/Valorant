import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/audit";
import {
  ACTIVE_TOURNAMENT_OPT_IN_KEY,
  buildTournamentOptInSummary,
} from "@/lib/tournaments/opt-in";
import type { TournamentOptInRow, UserRow } from "@/types/domain";

export const runtime = "nodejs";

const OptInPayload = z.object({
  tournament_key: z.string().min(1).max(160).optional(),
  status: z.enum(["in", "out"]),
});

export async function POST(request: NextRequest) {
  try {
    const { user, team } = await requireSession();
    const body = OptInPayload.parse(await request.json());
    const tournamentKey = body.tournament_key ?? ACTIVE_TOURNAMENT_OPT_IN_KEY;
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.from("tournament_opt_ins").upsert(
      {
        team_id: team.id,
        user_id: user.id,
        tournament_key: tournamentKey,
        status: body.status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "team_id,user_id,tournament_key" },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logActivity({
      teamId: team.id,
      actorId: user.id,
      verb: body.status === "in" ? "tournament_opted_in" : "tournament_opted_out",
      objectType: "tournament",
      objectId: tournamentKey,
      payload: { status: body.status },
    });

    const [{ data: members }, { data: optIns }] = await Promise.all([
      supabase
        .from("users")
        .select("id, display_name, email, avatar_url")
        .eq("team_id", team.id)
        .order("display_name", { ascending: true }),
      supabase
        .from("tournament_opt_ins")
        .select("user_id, status, updated_at")
        .eq("team_id", team.id)
        .eq("tournament_key", tournamentKey),
    ]);

    return NextResponse.json({
      data: buildTournamentOptInSummary({
        tournamentKey,
        currentUserId: user.id,
        members: (members ?? []) as Pick<UserRow, "id" | "display_name" | "email" | "avatar_url">[],
        optIns: (optIns ?? []) as Pick<TournamentOptInRow, "user_id" | "status" | "updated_at">[],
      }),
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}
