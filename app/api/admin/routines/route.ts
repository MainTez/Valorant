import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import type { RoutineItem, RoutineRow, UserRow } from "@/types/domain";

export const runtime = "nodejs";

const RoutineItemPayload = z.object({
  id: z.string().min(1).max(80).optional(),
  label: z.string().min(1).max(120),
  detail: z.string().max(280).optional(),
  duration: z.string().max(40).optional(),
  tag: z.string().max(40).optional(),
});

const SaveRoutinePayload = z.object({
  user_id: z.string().uuid(),
  title: z.string().min(1).max(120),
  items: z.array(RoutineItemPayload).min(1).max(20),
});

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return slug || "routine_item";
}

function normalizeItems(items: z.infer<typeof RoutineItemPayload>[]): RoutineItem[] {
  const seen = new Set<string>();
  return items.map((item) => {
    const base = slugify(item.id ?? item.label);
    let id = base;
    let suffix = 1;
    while (seen.has(id)) {
      suffix += 1;
      id = `${base}_${suffix}`;
    }
    seen.add(id);

    return {
      id,
      label: item.label.trim(),
      detail: item.detail?.trim() || undefined,
      duration: item.duration?.trim() || undefined,
      tag: item.tag?.trim() || undefined,
    };
  });
}

async function loadTargetPlayer(userId: string, adminTeamId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  const player = data as UserRow | null;
  if (!player) {
    const err = new Error("Player not found");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  if (player.team_id !== adminTeamId) {
    const err = new Error("Player is not on your team");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  return player;
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAdmin();
    const body = SaveRoutinePayload.parse(await request.json());
    const targetPlayer = await loadTargetPlayer(body.user_id, user.team_id);
    const admin = createSupabaseAdminClient();
    const items = normalizeItems(body.items);

    const { data: existing, error: existingError } = await admin
      .from("routines")
      .select("*")
      .eq("team_id", targetPlayer.team_id)
      .eq("assigned_user_id", targetPlayer.id)
      .eq("scope", "daily")
      .maybeSingle();

    if (existingError) throw existingError;

    const payload = {
      team_id: targetPlayer.team_id,
      assigned_user_id: targetPlayer.id,
      title: body.title.trim(),
      items,
      scope: "daily",
    };

    const query = existing
      ? admin.from("routines").update(payload).eq("id", (existing as RoutineRow).id)
      : admin.from("routines").insert(payload);

    const { data, error } = await query.select("*").maybeSingle();
    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Routine save failed" },
        { status: 400 },
      );
    }

    await logAudit({
      actorId: user.id,
      action: existing ? "routine.update_player" : "routine.assign_player",
      targetType: "routine",
      targetId: (data as RoutineRow).id,
      metadata: {
        assigned_user_id: targetPlayer.id,
        assigned_email: targetPlayer.email,
        item_count: items.length,
      },
    });

    return NextResponse.json({ data });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user } = await requireAdmin();
    const userId = request.nextUrl.searchParams.get("user_id");
    if (!userId) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    const targetPlayer = await loadTargetPlayer(userId, user.team_id);
    const admin = createSupabaseAdminClient();
    const { data: existing } = await admin
      .from("routines")
      .select("id")
      .eq("team_id", targetPlayer.team_id)
      .eq("assigned_user_id", targetPlayer.id)
      .eq("scope", "daily");

    const { error } = await admin
      .from("routines")
      .delete()
      .eq("team_id", targetPlayer.team_id)
      .eq("assigned_user_id", targetPlayer.id)
      .eq("scope", "daily");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logAudit({
      actorId: user.id,
      action: "routine.reset_player",
      targetType: "routine",
      targetId: targetPlayer.id,
      metadata: {
        assigned_user_id: targetPlayer.id,
        assigned_email: targetPlayer.email,
        deleted_count: existing?.length ?? 0,
      },
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}
