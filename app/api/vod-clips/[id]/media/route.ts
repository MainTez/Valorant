import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getVodClipPlaybackData } from "@/lib/vods.server";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { team } = await requireSession();
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: clip } = await supabase
      .from("vod_clips")
      .select("id, team_id, content_type, external_url, original_name, size_bytes, storage_path")
      .eq("id", id)
      .eq("team_id", team.id)
      .maybeSingle();

    if (!clip) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    const playback = await getVodClipPlaybackData({
      content_type: clip.content_type,
      external_url: clip.external_url,
      original_name: clip.original_name,
      size_bytes: clip.size_bytes,
      storage_path: clip.storage_path,
    });

    if (playback.kind === "missing") {
      return NextResponse.json({ error: playback.message }, { status: 404 });
    }

    return NextResponse.redirect(playback.kind === "uploaded" ? playback.signedUrl : playback.url);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}
