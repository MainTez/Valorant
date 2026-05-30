import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ACTIVE_TOURNAMENT_OPT_IN_KEY,
  TOURNAMENT_ROSTER_LIMIT,
  buildTournamentOptInSummary,
  optInStatusToVerb,
  TOURNAMENT_OPT_IN_OBJECT_TYPE,
  TOURNAMENT_OPT_IN_VERBS,
} from "@/lib/tournaments/opt-in";
import type { ActivityEventRow, UserRow } from "@/types/domain";

export const runtime = "nodejs";

const OptInPayload = z.union([
  z.object({
    tournament_key: z.string().min(1).max(160).optional(),
    status: z.enum(["in", "out"]),
  }),
  z.object({
    tournament_key: z.string().min(1).max(160).optional(),
    action: z.literal("promote"),
    user_id: z.string().min(1),
    replace_user_id: z.string().min(1).optional(),
  }),
]);

export async function POST(request: NextRequest) {
  try {
    const { user, team } = await requireSession();
    const body = OptInPayload.parse(await request.json());
    const tournamentKey = body.tournament_key ?? ACTIVE_TOURNAMENT_OPT_IN_KEY;
    const supabase = await createSupabaseServerClient();

    if ("status" in body) {
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

      return NextResponse.json({
        data: await loadTournamentOptInSummary({
          currentUserId: user.id,
          supabase,
          teamId: team.id,
          tournamentKey,
        }),
      });
    }

    if (user.role !== "coach" && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const summary = await loadTournamentOptInSummary({
      currentUserId: user.id,
      supabase,
      teamId: team.id,
      tournamentKey,
    });
    const target = summary.members.find((member) => member.userId === body.user_id);
    if (target?.status !== "waitlist") {
      return NextResponse.json(
        { error: "Only waitlisted players can be promoted." },
        { status: 400 },
      );
    }

    const replacement = body.replace_user_id
      ? summary.activeRoster.find((member) => member.userId === body.replace_user_id)
      : null;
    if (summary.activeCount >= TOURNAMENT_ROSTER_LIMIT && !replacement) {
      return NextResponse.json(
        { error: "Choose a locked player to move to waitlist first." },
        { status: 400 },
      );
    }

    const { error } = await supabase.from("activity_events").insert({
      team_id: team.id,
      actor_id: user.id,
      verb: "tournament_override",
      object_type: TOURNAMENT_OPT_IN_OBJECT_TYPE,
      object_id: tournamentKey,
      payload: {
        action: "promote",
        promoted_user_id: body.user_id,
        demoted_user_id: replacement?.userId ?? null,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      data: await loadTournamentOptInSummary({
        currentUserId: user.id,
        supabase,
        teamId: team.id,
        tournamentKey,
      }),
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}

async function loadTournamentOptInSummary({
  currentUserId,
  supabase,
  teamId,
  tournamentKey,
}: {
  currentUserId: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  teamId: string;
  tournamentKey: string;
}) {
  const [{ data: members }, { data: events }] = await Promise.all([
    supabase
      .from("users")
      .select("id, display_name, email, avatar_url, preferred_valorant_role, secondary_valorant_roles")
      .eq("team_id", teamId)
      .order("display_name", { ascending: true }),
    supabase
      .from("activity_events")
      .select("actor_id, verb, object_id, payload, created_at")
      .eq("team_id", teamId)
      .eq("object_type", TOURNAMENT_OPT_IN_OBJECT_TYPE)
      .eq("object_id", tournamentKey)
      .in("verb", [...TOURNAMENT_OPT_IN_VERBS])
      .order("created_at", { ascending: false })
      .limit(250),
  ]);

  return buildTournamentOptInSummary({
    tournamentKey,
    currentUserId,
    members: (members ?? []) as Pick<
      UserRow,
      | "id"
      | "display_name"
      | "email"
      | "avatar_url"
      | "preferred_valorant_role"
      | "secondary_valorant_roles"
    >[],
    events: (events ?? []) as Pick<ActivityEventRow, "actor_id" | "verb" | "object_id" | "payload" | "created_at">[],
  });
}
