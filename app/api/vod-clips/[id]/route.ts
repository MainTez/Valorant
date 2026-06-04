import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/get-session";
import { logActivity } from "@/lib/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteVodClipObject } from "@/lib/vods.server";

export const runtime = "nodejs";

const UpdateClipPayload = z.object({
  description: z.string().trim().max(2000).nullable().optional(),
  end_seconds: z.number().int().min(0).max(24 * 60 * 60).nullable().optional(),
  map: z.string().trim().max(40).nullable().optional(),
  opponent: z.string().trim().max(80).nullable().optional(),
  start_seconds: z.number().int().min(0).max(24 * 60 * 60).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(28)).max(8).optional(),
  title: z.string().trim().min(1).max(100).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { user, team } = await requireSession();
    const { id } = await params;
    const clip = await getTeamClip(id, team.id);
    if (!clip) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }
    if (!canManageClip({ createdBy: clip.created_by, role: user.role, userId: user.id })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = UpdateClipPayload.parse(await request.json());
    const nextStart = body.start_seconds ?? clip.start_seconds;
    const nextEnd = body.end_seconds ?? clip.end_seconds;
    if (nextStart !== null && nextEnd !== null && nextEnd <= nextStart) {
      return NextResponse.json(
        { error: "Clip end time must be after the start time." },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("vod_clips")
      .update({
        ...body,
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
      return NextResponse.json({ error: "Check the clip fields and try again." }, { status: 400 });
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
    const clip = await getTeamClip(id, team.id);
    if (!clip) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }
    if (!canManageClip({ createdBy: clip.created_by, role: user.role, userId: user.id })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("vod_clips")
      .delete()
      .eq("id", id)
      .eq("team_id", team.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (clip.storage_path) {
      await deleteVodClipObject(clip.storage_path).catch((deleteError) => {
        console.error("[vod-clips] delete failed:", deleteError);
      });
    }

    await logActivity({
      teamId: team.id,
      actorId: user.id,
      verb: "deleted_vod_clip",
      objectType: "vod_clip",
      objectId: id,
      payload: { title: clip.title },
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}

async function getTeamClip(id: string, teamId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("vod_clips")
    .select("*")
    .eq("id", id)
    .eq("team_id", teamId)
    .maybeSingle();

  return data as {
    created_by: string | null;
    end_seconds: number | null;
    id: string;
    start_seconds: number | null;
    storage_path: string | null;
    team_id: string;
    title: string;
  } | null;
}

function canManageClip({
  createdBy,
  role,
  userId,
}: {
  createdBy: string | null;
  role: "player" | "coach" | "admin";
  userId: string;
}) {
  return role === "admin" || role === "coach" || createdBy === userId;
}
