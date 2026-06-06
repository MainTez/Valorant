import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/get-session";
import { logActivity } from "@/lib/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteVodClipObject } from "@/lib/vods.server";
import {
  VOD_CLIP_MAX_TAGS,
  VOD_CLIP_MAX_FILE_BYTES,
  isVodClipPathForTeam,
  normalizeVodClipTags,
} from "@/lib/vods";

export const runtime = "nodejs";

const Seconds = z.number().int().min(0).max(24 * 60 * 60).nullable().optional();

const CreateClipPayload = z.object({
  content_type: z.string().min(1).max(120).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  end_seconds: Seconds,
  external_url: z.string().url().nullable().optional(),
  map: z.string().trim().max(40).nullable().optional(),
  match_id: z.string().uuid().nullable().optional(),
  opponent: z.string().trim().max(80).nullable().optional(),
  original_name: z.string().trim().max(255).nullable().optional(),
  size_bytes: z.number().int().positive().max(VOD_CLIP_MAX_FILE_BYTES).nullable().optional(),
  source_type: z.enum(["upload", "external"]),
  start_seconds: Seconds,
  storage_path: z.string().min(1).max(500).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(VOD_CLIP_MAX_TAGS).optional(),
  title: z.string().trim().min(1).max(100),
});

export async function POST(request: NextRequest) {
  try {
    const { user, team } = await requireSession();
    const body = CreateClipPayload.parse(await request.json());

    if (
      body.start_seconds !== null &&
      body.start_seconds !== undefined &&
      body.end_seconds !== null &&
      body.end_seconds !== undefined &&
      body.end_seconds <= body.start_seconds
    ) {
      return NextResponse.json(
        { error: "Clip end time must be after the start time." },
        { status: 400 },
      );
    }

    if (body.match_id) {
      const matchOk = await matchBelongsToTeam(body.match_id, team.id);
      if (!matchOk) {
        return NextResponse.json({ error: "Match not found" }, { status: 404 });
      }
    }

    if (body.source_type === "upload") {
      if (!body.storage_path || !isVodClipPathForTeam(body.storage_path, team.id)) {
        return NextResponse.json({ error: "Invalid clip upload path" }, { status: 400 });
      }
      if (!body.content_type || !body.original_name || !body.size_bytes) {
        return NextResponse.json({ error: "Uploaded clips need file metadata." }, { status: 400 });
      }
    }

    if (body.source_type === "external" && !body.external_url) {
      return NextResponse.json({ error: "Paste a clip URL or upload a file." }, { status: 400 });
    }

    const tags = normalizeVodClipTags(body.tags ?? []);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("vod_clips")
      .insert({
        content_type: body.source_type === "upload" ? body.content_type : null,
        created_by: user.id,
        description: body.description ?? null,
        end_seconds: body.end_seconds ?? null,
        external_url: body.source_type === "external" ? body.external_url : null,
        map: body.map || null,
        match_id: body.match_id ?? null,
        opponent: body.opponent || null,
        original_name: body.source_type === "upload" ? body.original_name : null,
        size_bytes: body.source_type === "upload" ? body.size_bytes : null,
        source_type: body.source_type,
        start_seconds: body.start_seconds ?? null,
        storage_path: body.source_type === "upload" ? body.storage_path : null,
        tags,
        team_id: team.id,
        title: body.title,
      })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      if (body.source_type === "upload" && body.storage_path) {
        await deleteVodClipObject(body.storage_path).catch(() => undefined);
      }
      return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 400 });
    }

    await logActivity({
      teamId: team.id,
      actorId: user.id,
      verb: "created_vod_clip",
      objectType: "vod_clip",
      objectId: data.id,
      payload: { title: body.title, sourceType: body.source_type },
    });

    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Check the clip fields and try again." }, { status: 400 });
    }
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}

async function matchBelongsToTeam(matchId: string, teamId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .eq("team_id", teamId)
    .maybeSingle();

  return Boolean(data);
}
