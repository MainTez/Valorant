import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { findWhitelistEntry, upsertWhitelistedUser } from "@/lib/auth/whitelist";
import { logAudit } from "@/lib/audit";
import { teamById, teamBySlug } from "@/lib/constants";
import type { EmailOtpType } from "@supabase/supabase-js";

function redirectToLogin(origin: string, error: string) {
  return NextResponse.redirect(`${origin}/login?error=${error}`);
}

function getCallbackErrorCode(error: unknown) {
  if (
    error instanceof Error &&
    error.message.includes("SUPABASE_SERVICE_ROLE_KEY")
  ) {
    return "server_config";
  }
  return "callback_failed";
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const otpType = url.searchParams.get("type");
  const origin = url.origin;
  const selectedTeam = teamBySlug(url.searchParams.get("team"));

  if (!code && !tokenHash) {
    return redirectToLogin(origin, "oauth_failed");
  }

  try {
    const supabase = await createSupabaseServerClient();
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("[auth/callback] exchange failed:", error.message);
        return redirectToLogin(origin, "oauth_failed");
      }
    } else if (tokenHash) {
      const type =
        otpType === "magiclink" ||
        otpType === "recovery" ||
        otpType === "invite" ||
        otpType === "signup" ||
        otpType === "email"
          ? (otpType as EmailOtpType)
          : "magiclink";

      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });

      if (error) {
        console.error("[auth/callback] otp verify failed:", error.message);
        return redirectToLogin(origin, "oauth_failed");
      }
    }

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser || !authUser.email) {
      await supabase.auth.signOut();
      return redirectToLogin(origin, "missing_email");
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
      return redirectToLogin(origin, "not_whitelisted");
    }

    const approvedTeam = teamById(whitelist.team_id);
    if (selectedTeam && approvedTeam && selectedTeam.id !== approvedTeam.id) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        `${origin}/login?error=team_mismatch&team=${selectedTeam.slug}`,
      );
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
  } catch (error) {
    console.error("[auth/callback] unexpected failure:", error);
    return redirectToLogin(origin, getCallbackErrorCode(error));
  }
}
