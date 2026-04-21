import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/audit";

export const runtime = "nodejs";

const TogglePayload = z.object({
  routine_id: z.string().uuid(),
  date: z.string().min(10),
  item_id: z.string().min(1),
  done: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const { user, team } = await requireSession();
    const body = TogglePayload.parse(await request.json());
    const supabase = await createSupabaseServerClient();

    const { data: existing } = await supabase
      .from("routine_progress")
      .select("*")
      .eq("routine_id", body.routine_id)
      .eq("user_id", user.id)
      .eq("date", body.date)
      .maybeSingle();

    const currentItems: string[] = (existing?.completed_items as string[] | undefined) ?? [];
    const set = new Set(currentItems);
    if (body.done) set.add(body.item_id);
    else set.delete(body.item_id);
    const newItems = [...set];

    if (existing) {
      const { error } = await supabase
        .from("routine_progress")
        .update({ completed_items: newItems })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("routine_progress").insert({
        routine_id: body.routine_id,
        user_id: user.id,
        date: body.date,
        completed_items: newItems,
      });
      if (error) throw error;
    }

    if (body.done) {
      await logActivity({
        teamId: team.id,
        actorId: user.id,
        verb: "completed_routine",
        objectType: "routine",
        objectId: body.routine_id,
        payload: { item_id: body.item_id },
      });
    }

    return NextResponse.json({ data: { completed_items: newItems } });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}
