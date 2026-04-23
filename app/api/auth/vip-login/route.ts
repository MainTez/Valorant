import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { upsertWhitelistedUser } from "@/lib/auth/whitelist";
import { logAudit } from "@/lib/audit";
import { teamBySlug, type TeamSlug } from "@/lib/constants";
import { VIP_EMAILS, VIP_PASSWORDS, VIP_USER_IDS } from "@/lib/auth/vip";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { team?: string };
    const selectedTeam = teamBySlug(body.team ?? null);

    if (!selectedTeam) {
      return NextResponse.json({ error: "team_required" }, { status: 400 });
    }

    const slug = selectedTeam.slug as TeamSlug;
    const email = VIP_EMAILS[slug];
    const userId = VIP_USER_IDS[slug];
    const password = VIP_PASSWORDS[slug];

    const admin = createSupabaseAdminClient();

    const { error: whitelistError } = await admin.from("whitelist").upsert(
      {
        email,
        team_id: selectedTeam.id,
        role: "admin",
      },
      { onConflict: "email" },
    );
    if (whitelistError) throw whitelistError;

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

    if (createUserError && !/already|exists|registered/i.test(createUserError.message)) {
      throw createUserError;
    }

    // Keep password in sync with VIP_PASSWORDS across restarts / rotations.
    await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });

    await upsertWhitelistedUser({
      authUserId: userId,
      email,
      displayName: `${selectedTeam.name} VIP`,
      avatarUrl: null,
      teamId: selectedTeam.id,
      role: "admin",
    });

    const supabase = await createSupabaseServerClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) throw signInError;

    await logAudit({
      actorId: userId,
      action: "vip_signin",
      targetType: "user",
      targetId: userId,
      metadata: { team: selectedTeam.slug, email },
    });

    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  } catch (error) {
    console.error("[auth/vip-login] failed:", error);
    const message = error instanceof Error ? error.message : "vip_login_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
