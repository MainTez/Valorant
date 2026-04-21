import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/audit";

export const runtime = "nodejs";

const Payload = z.object({
  opponent: z.string().min(1).max(80),
  type: z.enum(["scrim", "official", "tournament"]),
  date: z.string().min(8),
  map: z.string().min(1).max(40),
  score_us: z.number().int().min(0).max(30),
  score_them: z.number().int().min(0).max(30),
  notes: z.string().max(2000).nullable().optional(),
  vod_url: z.string().url().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { user, team } = await requireSession();
    const body = Payload.parse(await request.json());
    const result =
      body.score_us > body.score_them
        ? "win"
        : body.score_us < body.score_them
          ? "loss"
          : "draw";

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("matches")
      .insert({
        team_id: team.id,
        opponent: body.opponent,
        type: body.type,
        date: new Date(body.date).toISOString(),
        map: body.map,
        score_us: body.score_us,
        score_them: body.score_them,
        result,
        notes: body.notes ?? null,
        vod_url: body.vod_url ?? null,
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
      verb: "logged_match",
      objectType: "match",
      objectId: data.id,
      payload: { opponent: body.opponent, result, map: body.map },
    });

    return NextResponse.json({ data });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}
