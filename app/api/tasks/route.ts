import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/audit";

export const runtime = "nodejs";

const CreatePayload = z.object({
  title: z.string().min(1).max(140),
  description: z.string().max(4000).nullable().optional(),
  priority: z.enum(["low", "med", "high"]).optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  due_at: z.string().nullable().optional(),
});

const UpdatePayload = z.object({
  id: z.string().uuid(),
  status: z.enum(["backlog", "in_progress", "done"]).optional(),
  title: z.string().min(1).max(140).optional(),
  description: z.string().max(4000).nullable().optional(),
  priority: z.enum(["low", "med", "high"]).optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  due_at: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { user, team } = await requireSession();
    const body = CreatePayload.parse(await request.json());

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        team_id: team.id,
        title: body.title,
        description: body.description ?? null,
        priority: body.priority ?? "med",
        status: "backlog",
        assignee_id: body.assignee_id ?? null,
        created_by: user.id,
        due_at: body.due_at ?? null,
      })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 400 });
    }
    await logActivity({
      teamId: team.id,
      actorId: user.id,
      verb: "updated_task",
      objectType: "task",
      objectId: data.id,
      payload: { title: body.title },
    });
    return NextResponse.json({ data });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, team } = await requireSession();
    const body = UpdatePayload.parse(await request.json());
    const { id, ...rest } = body;

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("tasks")
      .update({ ...rest })
      .eq("id", id)
      .eq("team_id", team.id)
      .select("*")
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 400 });
    }
    await logActivity({
      teamId: team.id,
      actorId: user.id,
      verb: "updated_task",
      objectType: "task",
      objectId: data.id,
      payload: rest,
    });
    return NextResponse.json({ data });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { team } = await requireSession();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("team_id", team.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}
