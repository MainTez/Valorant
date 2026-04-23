import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/get-session";
import { logActivity } from "@/lib/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canDeleteMatch } from "@/lib/vods";
import { deleteMatchVodObject } from "@/lib/vods.server";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { user, team } = await requireSession();
    const { id } = await params;

    const supabase = await createSupabaseServerClient();
    const { data: match } = await supabase
      .from("matches")
      .select("id, team_id, created_by, vod_storage_path, opponent, map")
      .eq("id", id)
      .eq("team_id", team.id)
      .maybeSingle();

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (
      !canDeleteMatch({
        createdBy: match.created_by,
        role: user.role,
        userId: user.id,
      })
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (match.vod_storage_path) {
      try {
        await deleteMatchVodObject(match.vod_storage_path);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/not found|not exist|no such/i.test(message)) {
          throw error;
        }
      }
    }

    const { data, error } = await supabase
      .from("matches")
      .delete()
      .eq("id", id)
      .eq("team_id", team.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Delete failed" }, { status: 400 });
    }

    await logActivity({
      teamId: team.id,
      actorId: user.id,
      verb: "deleted_match",
      objectId: id,
      objectType: "match",
      payload: {
        map: match.map,
        opponent: match.opponent,
      },
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}
