import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/get-session";
import { logActivity } from "@/lib/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createMatchVodSignedUpload,
  createMatchVodSignedUrl,
  deleteMatchVodObject,
} from "@/lib/vods.server";
import { MATCH_VOD_MAX_FILE_BYTES, isMatchVodPathForMatch } from "@/lib/vods";

export const runtime = "nodejs";

const CreateUploadPayload = z.object({
  contentType: z.string().min(1).max(120),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(MATCH_VOD_MAX_FILE_BYTES),
});

const AttachUploadPayload = z.object({
  vod_content_type: z.string().min(1).max(120),
  vod_original_name: z.string().min(1).max(255),
  vod_size_bytes: z.number().int().positive().max(MATCH_VOD_MAX_FILE_BYTES),
  vod_storage_path: z.string().min(1).max(500),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { team } = await requireSession();
    const { id } = await params;
    const match = await getTeamMatch(id, team.id);

    if (!match?.vod_storage_path) {
      return NextResponse.json({ error: "VOD not found" }, { status: 404 });
    }

    const signedUrl = await createMatchVodSignedUrl(match.vod_storage_path);
    return NextResponse.redirect(signedUrl);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { team } = await requireSession();
    const { id } = await params;
    const match = await getTeamMatch(id, team.id);
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const body = CreateUploadPayload.parse(await request.json());
    const data = await createMatchVodSignedUpload({
      contentType: body.contentType,
      fileName: body.fileName,
      fileSize: body.fileSize,
      matchId: id,
      teamId: team.id,
    });

    return NextResponse.json({ data });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { user, team } = await requireSession();
    const { id } = await params;
    const match = await getTeamMatch(id, team.id);
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const body = AttachUploadPayload.parse(await request.json());
    if (!isMatchVodPathForMatch(body.vod_storage_path, team.id, id)) {
      return NextResponse.json({ error: "Invalid VOD path" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("matches")
      .update({
        vod_content_type: body.vod_content_type,
        vod_original_name: body.vod_original_name,
        vod_size_bytes: body.vod_size_bytes,
        vod_storage_path: body.vod_storage_path,
        vod_url: null,
      })
      .eq("id", id)
      .eq("team_id", team.id)
      .select("id, vod_storage_path")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 400 });
    }

    if (match.vod_storage_path && match.vod_storage_path !== body.vod_storage_path) {
      try {
        await deleteMatchVodObject(match.vod_storage_path);
      } catch (deleteError) {
        console.error("[vod] old object cleanup failed:", deleteError);
      }
    }

    await logActivity({
      teamId: team.id,
      actorId: user.id,
      verb: "uploaded_match_vod",
      objectId: id,
      objectType: "match",
      payload: {
        fileName: body.vod_original_name,
        sizeBytes: body.vod_size_bytes,
      },
    });

    return NextResponse.json({ data });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { user, team } = await requireSession();
    const { id } = await params;
    const match = await getTeamMatch(id, team.id);
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("matches")
      .update({
        vod_content_type: null,
        vod_original_name: null,
        vod_size_bytes: null,
        vod_storage_path: null,
      })
      .eq("id", id)
      .eq("team_id", team.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 400 });
    }

    if (match.vod_storage_path) {
      try {
        await deleteMatchVodObject(match.vod_storage_path);
      } catch (deleteError) {
        console.error("[vod] delete failed:", deleteError);
      }
    }

    await logActivity({
      teamId: team.id,
      actorId: user.id,
      verb: "removed_match_vod",
      objectId: id,
      objectType: "match",
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}

async function getTeamMatch(id: string, teamId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("matches")
    .select("id, team_id, vod_storage_path")
    .eq("id", id)
    .eq("team_id", teamId)
    .maybeSingle();

  return data as { id: string; team_id: string; vod_storage_path: string | null } | null;
}
