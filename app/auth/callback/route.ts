import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { findWhitelistEntry, upsertWhitelistedUser } from "@/lib/auth/whitelist";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser || !authUser.email) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=missing_email`);
  }

  const whitelist = await findWhitelistEntry(authUser.email);
  if (!whitelist) {
    // Not on the whitelist — revoke session
    await supabase.auth.signOut();
    try {
      const admin = createSupabaseAdminClient();
      await admin.auth.admin.deleteUser(authUser.id);
    } catch {
      // ignore — deletion best-effort (requires service-role privileges)
    }
    return NextResponse.redirect(`${origin}/login?error=not_whitelisted`);
  }

  const meta = authUser.user_metadata as Record<string, unknown> | undefined;
  const displayName =
    (typeof meta?.full_name === "string" ? meta.full_name : null) ||
    (typeof meta?.name === "string" ? meta.name : null) ||
    authUser.email.split("@")[0];
  const avatarUrl =
    (typeof meta?.avatar_url === "string" ? meta.avatar_url : null) ||
    (typeof meta?.picture === "string" ? meta.picture : null) ||
    null;

  await upsertWhitelistedUser({
    authUserId: authUser.id,
    email: authUser.email,
    displayName,
    avatarUrl,
    teamId: whitelist.team_id,
    role: whitelist.role,
  });

  await logAudit({
    actorId: authUser.id,
    action: "signin",
    targetType: "user",
    targetId: authUser.id,
    metadata: { email: authUser.email, role: whitelist.role },
  });

  return NextResponse.redirect(`${origin}/dashboard`);
}
