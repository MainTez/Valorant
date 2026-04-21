import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const Payload = z.object({
  channelId: z.string().uuid(),
  body: z.string().min(1).max(2000),
});

export async function POST(request: NextRequest) {
  try {
    const { user, team } = await requireSession();
    const { channelId, body } = Payload.parse(await request.json());

    const supabase = await createSupabaseServerClient();
    const { data: channel, error: chanErr } = await supabase
      .from("chat_channels")
      .select("id, team_id")
      .eq("id", channelId)
      .maybeSingle();

    if (chanErr || !channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }
    if (channel.team_id !== team.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        channel_id: channelId,
        team_id: team.id,
        author_id: user.id,
        body,
      })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 400 });
    }
    return NextResponse.json({ data });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}
