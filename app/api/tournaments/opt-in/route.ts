import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ACTIVE_TOURNAMENT_OPT_IN_KEY,
  buildTournamentOptInSummary,
  optInStatusToVerb,
  TOURNAMENT_OPT_IN_OBJECT_TYPE,
  TOURNAMENT_OPT_IN_VERBS,
} from "@/lib/tournaments/opt-in";
import type { ActivityEventRow, UserRow } from "@/types/domain";

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
    const verb = optInStatusToVerb(body.status);

    const { error } = await supabase
      .from("activity_events")
      .insert({
        team_id: team.id,
        actor_id: user.id,
        verb,
        object_type: TOURNAMENT_OPT_IN_OBJECT_TYPE,
        object_id: tournamentKey,
        payload: { status: body.status },
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const [{ data: members }, { data: events }] = await Promise.all([
      supabase
        .from("users")
        .select("id, display_name, email, avatar_url")
        .eq("team_id", team.id)
        .order("display_name", { ascending: true }),
      supabase
        .from("activity_events")
        .select("actor_id, verb, object_id, payload, created_at")
        .eq("team_id", team.id)
        .eq("object_type", TOURNAMENT_OPT_IN_OBJECT_TYPE)
        .eq("object_id", tournamentKey)
        .in("verb", [...TOURNAMENT_OPT_IN_VERBS])
        .order("created_at", { ascending: false })
        .limit(250),
    ]);

    return NextResponse.json({
      data: buildTournamentOptInSummary({
        tournamentKey,
        currentUserId: user.id,
        members: (members ?? []) as Pick<UserRow, "id" | "display_name" | "email" | "avatar_url">[],
        events: (events ?? []) as Pick<ActivityEventRow, "actor_id" | "verb" | "object_id" | "payload" | "created_at">[],
      }),
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}
