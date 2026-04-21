import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/audit";

export const runtime = "nodejs";

const Payload = z.object({
  match_id: z.string().uuid(),
  body: z.string().min(1).max(4000),
});

export async function POST(request: NextRequest) {
  try {
    const { user, team } = await requireSession();
    const payload = Payload.parse(await request.json());

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("coach_notes")
      .insert({
        match_id: payload.match_id,
        team_id: team.id,
        author_id: user.id,
        body: payload.body,
      })
      .select("*")
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 400 });
    }

    await logActivity({
      teamId: team.id,
      actorId: user.id,
      verb: "added_note",
      objectType: "match",
      objectId: payload.match_id,
    });

    return NextResponse.json({ data });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}
