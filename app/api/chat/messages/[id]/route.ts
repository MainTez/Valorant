import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const UpdateMessagePayload = z.object({
  body: z.string().trim().min(1).max(2000),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { user, team } = await requireSession();
    const { id } = await params;
    const message = await getTeamMessage(id, team.id);
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    if (message.author_id !== user.id) {
      return NextResponse.json({ error: "Only the author can edit this message." }, { status: 403 });
    }

    const body = UpdateMessagePayload.parse(await request.json());
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("chat_messages")
      .update({
        body: body.body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("team_id", team.id)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    }
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { user, team } = await requireSession();
    const { id } = await params;
    const message = await getTeamMessage(id, team.id);
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    if (message.author_id !== user.id && user.role !== "admin") {
      return NextResponse.json(
        { error: "Only the author or an admin can delete this message." },
        { status: 403 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("chat_messages")
      .delete()
      .eq("id", id)
      .eq("team_id", team.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: { ok: true, id } });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}

async function getTeamMessage(id: string, teamId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("chat_messages")
    .select("id, channel_id, team_id, author_id, body, created_at, updated_at")
    .eq("id", id)
    .eq("team_id", teamId)
    .maybeSingle();

  return data as {
    author_id: string;
    id: string;
    team_id: string;
  } | null;
}
