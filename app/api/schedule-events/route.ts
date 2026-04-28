import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireCoachOrAdmin } from "@/lib/auth/get-session";
import { logActivity } from "@/lib/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const EventPayload = z.object({
  title: z.string().trim().min(1).max(140),
  kind: z.enum(["practice", "scrim", "match", "review", "custom"]).optional(),
  start_at: z.string().min(1),
  end_at: z.string().nullable().optional(),
  participants: z.array(z.string().uuid()).max(50).optional(),
  description: z.string().max(2000).nullable().optional(),
  location: z.string().max(140).nullable().optional(),
});

const UpdatePayload = EventPayload.extend({
  id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const { user, team } = await requireCoachOrAdmin();
    const body = EventPayload.parse(await request.json());
    const supabase = await createSupabaseServerClient();
    const payload = await buildSchedulePayload(body, team.id, supabase);

    const { data, error } = await supabase
      .from("schedule_events")
      .insert({
        ...payload,
        team_id: team.id,
        created_by: user.id,
      })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 400 });
    }

    await logActivity({
      teamId: team.id,
      actorId: user.id,
      verb: "scheduled_event",
      objectType: "schedule_event",
      objectId: data.id,
      payload: { title: body.title, kind: body.kind ?? "custom" },
    });

    return NextResponse.json({ data });
  } catch (err) {
    return scheduleErrorResponse(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, team } = await requireCoachOrAdmin();
    const body = UpdatePayload.parse(await request.json());
    const supabase = await createSupabaseServerClient();
    const payload = await buildSchedulePayload(body, team.id, supabase);

    const { data, error } = await supabase
      .from("schedule_events")
      .update(payload)
      .eq("id", body.id)
      .eq("team_id", team.id)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 400 });
    }

    await logActivity({
      teamId: team.id,
      actorId: user.id,
      verb: "updated_schedule_event",
      objectType: "schedule_event",
      objectId: data.id,
      payload: { title: body.title, kind: body.kind ?? "custom" },
    });

    return NextResponse.json({ data });
  } catch (err) {
    return scheduleErrorResponse(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, team } = await requireCoachOrAdmin();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const parsed = z.string().uuid().parse(id);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("schedule_events")
      .delete()
      .eq("id", parsed)
      .eq("team_id", team.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logActivity({
      teamId: team.id,
      actorId: user.id,
      verb: "deleted_schedule_event",
      objectType: "schedule_event",
      objectId: parsed,
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    return scheduleErrorResponse(err);
  }
}

type ScheduleBody = z.infer<typeof EventPayload>;
type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function buildSchedulePayload(
  body: ScheduleBody,
  teamId: string,
  supabase: SupabaseServerClient,
) {
  const startAt = parseInstant(body.start_at, "Start time");
  const endAt = body.end_at ? parseInstant(body.end_at, "End time") : null;
  if (endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    throw new Error("End time must be after start time");
  }

  return {
    title: body.title,
    kind: body.kind ?? "custom",
    start_at: startAt,
    end_at: endAt,
    participants: await validateParticipants(body.participants ?? [], teamId, supabase),
    description: normalizeOptionalText(body.description),
    location: normalizeOptionalText(body.location),
  };
}

function parseInstant(value: string, label: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date`);
  }
  return date.toISOString();
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

async function validateParticipants(
  participantIds: string[],
  teamId: string,
  supabase: SupabaseServerClient,
): Promise<string[]> {
  const uniqueIds = [...new Set(participantIds)];
  if (uniqueIds.length === 0) return [];

  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("team_id", teamId)
    .in("id", uniqueIds);

  if (error) {
    throw new Error(error.message);
  }

  const validIds = new Set((data ?? []).map((user) => String(user.id)));
  if (uniqueIds.some((id) => !validIds.has(id))) {
    throw new Error("Participants must belong to your team");
  }

  return uniqueIds;
}

function scheduleErrorResponse(err: unknown) {
  const status = (err as { status?: number }).status ?? 400;
  const message = err instanceof Error ? err.message : "Bad request";
  return NextResponse.json({ error: message }, { status });
}
