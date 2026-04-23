import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { teamBySlug, type TeamSlug } from "@/lib/constants";
import { upsertWhitelistedUser } from "@/lib/auth/whitelist";

const VIP_EMAILS: Record<TeamSlug, string> = {
  "surf-n-bulls": "vip+surf-n-bulls@example.com",
  molgarians: "vip+molgarians@example.com",
};

const VIP_USER_IDS: Record<TeamSlug, string> = {
  "surf-n-bulls": "00000000-0000-0000-0000-00000000a001",
  molgarians: "00000000-0000-0000-0000-00000000a002",
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
    const userId = VIP_USER_IDS[selectedTeam.slug];

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

    const password = `vip-${selectedTeam.slug}-access`;

    const { error: createUserError } = await admin.auth.admin.createUser({
      id: userId,
      email,
      email_confirm: true,
      password,
      user_metadata: {
        full_name: `${selectedTeam.name} VIP`,
        vip: true,
      },
    });

    if (createUserError && !createUserError.message.toLowerCase().includes("already")) {
      throw createUserError;
    }

    await upsertWhitelistedUser({
      authUserId: userId,
      email,
      displayName: `${selectedTeam.name} VIP`,
      avatarUrl: null,
      teamId: selectedTeam.id,
      role: "admin",
    });

    await logAudit({
      actorId: null,
      action: "vip_login_started",
      targetType: "user",
      targetId: userId,
      metadata: {
        team: selectedTeam.slug,
        email,
      },
    });

    const supabase = await createSupabaseServerClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      throw signInError;
    }

    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  } catch (error) {
    console.error("[auth/vip-login] failed:", error);
    const message = error instanceof Error ? error.message : "vip_login_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
