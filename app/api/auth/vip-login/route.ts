import { NextResponse } from "next/server";
import { teamBySlug, type TeamSlug } from "@/lib/constants";
import { VIP_SESSION_COOKIE, encodeVipSession } from "@/lib/auth/vip";

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

    const userId = VIP_USER_IDS[selectedTeam.slug];
    const response = NextResponse.json({ ok: true, redirectTo: "/dashboard" });
    response.cookies.set(
      VIP_SESSION_COOKIE,
      encodeVipSession({
        userId,
        teamId: selectedTeam.id,
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: new URL(request.url).protocol === "https:",
        path: "/",
        maxAge: 60 * 60 * 12,
      },
    );
    return response;
  } catch (error) {
    console.error("[auth/vip-login] failed:", error);
    const message = error instanceof Error ? error.message : "vip_login_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
