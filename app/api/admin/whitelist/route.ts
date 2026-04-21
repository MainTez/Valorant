import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const CreatePayload = z.object({
  email: z.string().email(),
  team_id: z.string().uuid(),
  role: z.enum(["player", "coach", "admin"]),
});

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAdmin();
    const body = CreatePayload.parse(await request.json());

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("whitelist")
      .insert({
        email: body.email.toLowerCase(),
        team_id: body.team_id,
        role: body.role,
        added_by: user.id,
      })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 400 });
    }

    await logAudit({
      actorId: user.id,
      action: "whitelist.add",
      targetType: "whitelist",
      targetId: data.id,
      metadata: { email: body.email, role: body.role, team_id: body.team_id },
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
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const admin = createSupabaseAdminClient();
    const { data: existing } = await admin
      .from("whitelist")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    const { error } = await admin.from("whitelist").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await logAudit({
      actorId: user.id,
      action: "whitelist.remove",
      targetType: "whitelist",
      targetId: id,
      metadata: existing ? { email: existing.email } : {},
    });
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}
