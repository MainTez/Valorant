import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { teamBySlug, type TeamSlug } from "@/lib/constants";

const VIP_EMAILS: Record<TeamSlug, string> = {
  "surf-n-bulls": "vip+surf-n-bulls@esporthub.local",
  molgarians: "vip+molgarians@esporthub.local",
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { team?: string };
    const selectedTeam = teamBySlug(body.team ?? null);

    if (!selectedTeam) {
      return NextResponse.json({ error: "team_required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const email = VIP_EMAILS[selectedTeam.slug];

    const { error: whitelistError } = await admin.from("whitelist").upsert(
      {
        email,
        team_id: selectedTeam.id,
        role: "admin",
      },
      { onConflict: "email" },
    );

    if (whitelistError) {
      throw whitelistError;
    }

    const origin = new URL(request.url).origin;
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${origin}/auth/callback?team=${selectedTeam.slug}`,
      },
    });

    if (error) {
      throw error;
    }

    await logAudit({
      actorId: null,
      action: "vip_login_issued",
      targetType: "user",
      targetId: data.user?.id ?? null,
      metadata: {
        team: selectedTeam.slug,
        email,
      },
    });

    const redirectTo = data.properties?.action_link;
    if (!redirectTo) {
      return NextResponse.json({ error: "vip_link_missing" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, redirectTo });
  } catch (error) {
    console.error("[auth/vip-login] failed:", error);
    const message = error instanceof Error ? error.message : "vip_login_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
