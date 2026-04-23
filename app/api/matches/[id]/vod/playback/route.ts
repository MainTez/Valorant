import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMatchVodPlaybackData } from "@/lib/vods.server";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { team } = await requireSession();
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const { data: match } = await supabase
      .from("matches")
      .select("id, team_id, vod_content_type, vod_original_name, vod_size_bytes, vod_storage_path, vod_url")
      .eq("id", id)
      .eq("team_id", team.id)
      .maybeSingle();

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const playback = await getMatchVodPlaybackData({
      vod_content_type: match.vod_content_type,
      vod_original_name: match.vod_original_name,
      vod_size_bytes: match.vod_size_bytes,
      vod_storage_path: match.vod_storage_path,
      vod_url: match.vod_url,
    });

    if (playback.kind === "missing") {
      return NextResponse.json({ error: playback.message }, { status: 404 });
    }

    return NextResponse.json({ data: playback });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}
