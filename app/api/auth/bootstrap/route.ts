import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { findWhitelistEntry, upsertWhitelistedUser } from "@/lib/auth/whitelist";
import { teamById, teamBySlug } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { team?: string };
    const selectedTeam = teamBySlug(body.team ?? null);

    if (!selectedTeam) {
      return NextResponse.json({ error: "team_required" }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.replace(/^Bearer\s+/i, "").trim();

    let user: {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
    } | null = null;
    let userError: Error | null = null;

    if (accessToken) {
      const admin = createSupabaseAdminClient();
      const result = await admin.auth.getUser(accessToken);
      user = result.data.user;
      userError = result.error;
    } else {
      const supabase = await createSupabaseServerClient();
      const result = await supabase.auth.getUser();
      user = result.data.user;
      userError = result.error;
    }

    if (userError || !user || !user.email) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const whitelist = await findWhitelistEntry(user.email);
    if (!whitelist) {
      return NextResponse.json({ error: "not_whitelisted" }, { status: 403 });
    }

    const approvedTeam = teamById(whitelist.team_id);
    if (!approvedTeam || whitelist.team_id !== selectedTeam.id) {
      return NextResponse.json(
        { error: "team_mismatch", team: approvedTeam?.slug ?? null },
        { status: 403 },
      );
    }

    const metadata = user.user_metadata as Record<string, unknown> | undefined;
    const displayName =
      (typeof metadata?.full_name === "string" ? metadata.full_name : null) ||
      (typeof metadata?.name === "string" ? metadata.name : null) ||
      user.email.split("@")[0];
    const avatarUrl =
      (typeof metadata?.avatar_url === "string" ? metadata.avatar_url : null) ||
      (typeof metadata?.picture === "string" ? metadata.picture : null) ||
      null;

    await upsertWhitelistedUser({
      authUserId: user.id,
      email: user.email,
      displayName,
      avatarUrl,
      teamId: whitelist.team_id,
      role: whitelist.role,
    });

    await logAudit({
      actorId: user.id,
      action: "signin_password",
      targetType: "user",
      targetId: user.id,
      metadata: {
        email: user.email,
        provider: "password",
        role: whitelist.role,
        team: approvedTeam.slug,
      },
    });

    return NextResponse.json({ ok: true, team: approvedTeam.slug });
  } catch (error) {
    console.error("[auth/bootstrap] failed:", error);
    return NextResponse.json({ error: "bootstrap_failed" }, { status: 500 });
  }
}
