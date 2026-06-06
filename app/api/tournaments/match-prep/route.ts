import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ACTIVE_TOURNAMENT_OPT_IN_KEY,
  TOURNAMENT_OPT_IN_OBJECT_TYPE,
  TOURNAMENT_OPT_IN_VERBS,
  buildTournamentOptInSummary,
} from "@/lib/tournaments/opt-in";
import {
  TOURNAMENT_MATCH_PREP_OBJECT_TYPE,
  TOURNAMENT_MATCH_PREP_VERBS,
  buildTournamentMatchPrepSummary,
  isTournamentMatchPrepChecklistId,
} from "@/lib/tournaments/match-prep";
import type { ActivityEventRow, UserRow } from "@/types/domain";

export const runtime = "nodejs";

const MatchPrepPayload = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("notes"),
    matchup_key: z.string().min(1).max(220),
    division_name: z.string().max(160).nullable().optional(),
    matchup_starts_at: z.string().nullable().optional(),
    notes: z.string().max(4000),
    opponent_name: z.string().max(160).optional(),
  }),
  z.object({
    action: z.literal("ready"),
    matchup_key: z.string().min(1).max(220),
    ready: z.boolean(),
    user_id: z.string().uuid().optional(),
  }),
  z.object({
    action: z.literal("checklist"),
    matchup_key: z.string().min(1).max(220),
    checked: z.boolean(),
    item_id: z.string().refine(isTournamentMatchPrepChecklistId, "Unknown checklist item"),
  }),
]);

export async function GET(request: NextRequest) {
  try {
    const { user, team } = await requireSession();
    if (team.slug !== "surf-n-bulls") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const matchupKey = request.nextUrl.searchParams.get("matchup_key");
    if (!matchupKey) {
      return NextResponse.json({ error: "Missing matchup_key" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    return NextResponse.json({
      data: await loadMatchPrepSummary({
        currentUserId: user.id,
        matchupKey,
        supabase,
        teamId: team.id,
      }),
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, team } = await requireSession();
    if (team.slug !== "surf-n-bulls") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = MatchPrepPayload.parse(await request.json());
    const canManage = user.role === "coach" || user.role === "admin";
    const supabase = await createSupabaseServerClient();

    if (body.action === "notes" || body.action === "checklist") {
      if (!canManage) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    let payload: Record<string, unknown>;
    let verb: (typeof TOURNAMENT_MATCH_PREP_VERBS)[number];

    if (body.action === "notes") {
      verb = "tournament_prep_notes_updated";
      payload = {
        division_name: body.division_name?.trim() || null,
        matchup_starts_at: body.matchup_starts_at?.trim() || null,
        notes: body.notes.trim(),
        opponent_name: body.opponent_name?.trim() || null,
      };
    } else if (body.action === "checklist") {
      verb = "tournament_prep_checklist_updated";
      payload = {
        checked: body.checked,
        item_id: body.item_id,
      };
    } else {
      const summary = await loadMatchPrepSummary({
        currentUserId: user.id,
        matchupKey: body.matchup_key,
        supabase,
        teamId: team.id,
      });
      const targetUserId = body.user_id ?? user.id;
      if (targetUserId !== user.id && !canManage) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!(targetUserId in summary.readyByUserId)) {
        return NextResponse.json(
          { error: "Only locked roster players can be marked ready." },
          { status: 400 },
        );
      }

      verb = "tournament_prep_ready_updated";
      payload = {
        ready: body.ready,
        user_id: targetUserId,
      };
    }

    const { error } = await supabase.from("activity_events").insert({
      team_id: team.id,
      actor_id: user.id,
      verb,
      object_type: TOURNAMENT_MATCH_PREP_OBJECT_TYPE,
      object_id: body.matchup_key,
      payload,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      data: await loadMatchPrepSummary({
        currentUserId: user.id,
        matchupKey: body.matchup_key,
        supabase,
        teamId: team.id,
      }),
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}

async function loadMatchPrepSummary({
  currentUserId,
  matchupKey,
  supabase,
  teamId,
}: {
  currentUserId: string;
  matchupKey: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  teamId: string;
}) {
  const [{ data: members }, { data: optInEvents }, { data: prepEvents }] = await Promise.all([
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
      .eq("object_id", ACTIVE_TOURNAMENT_OPT_IN_KEY)
      .in("verb", [...TOURNAMENT_OPT_IN_VERBS])
      .order("created_at", { ascending: false })
      .limit(250),
    supabase
      .from("activity_events")
      .select("actor_id, verb, object_id, payload, created_at")
      .eq("team_id", teamId)
      .eq("object_type", TOURNAMENT_MATCH_PREP_OBJECT_TYPE)
      .eq("object_id", matchupKey)
      .in("verb", [...TOURNAMENT_MATCH_PREP_VERBS])
      .order("created_at", { ascending: false })
      .limit(250),
  ]);

  const optInSummary = buildTournamentOptInSummary({
    tournamentKey: ACTIVE_TOURNAMENT_OPT_IN_KEY,
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
    events: (optInEvents ?? []) as Pick<ActivityEventRow, "actor_id" | "verb" | "object_id" | "payload" | "created_at">[],
  });

  return buildTournamentMatchPrepSummary({
    matchupKey,
    roster: optInSummary.activeRoster,
    events: (prepEvents ?? []) as Pick<ActivityEventRow, "actor_id" | "verb" | "object_id" | "payload" | "created_at">[],
  });
}
