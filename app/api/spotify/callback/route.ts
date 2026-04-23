import { Buffer } from "node:buffer";
import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const STATE_COOKIE = "spotify_oauth_state";

interface SpotifyTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface SpotifyMeResponse {
  id?: string;
}

function dashboardRedirect(request: NextRequest, status: string) {
  const url = new URL("/dashboard", request.url);
  url.searchParams.set("spotify", status);
  return url;
}

export async function GET(request: NextRequest) {
  const { user } = await requireSession();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !savedState || state !== savedState) {
    const response = NextResponse.redirect(dashboardRedirect(request, "state_failed"));
    response.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    const response = NextResponse.redirect(dashboardRedirect(request, "not_configured"));
    response.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }

  const redirectUri =
    process.env.SPOTIFY_REDIRECT_URI ??
    new URL("/api/spotify/callback", request.nextUrl.origin).toString();

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const response = NextResponse.redirect(dashboardRedirect(request, "token_failed"));
    response.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }

  const token = (await tokenRes.json()) as SpotifyTokenResponse;
  if (!token.refresh_token) {
    const response = NextResponse.redirect(dashboardRedirect(request, "refresh_missing"));
    response.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }

  const meRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const me = meRes.ok ? ((await meRes.json()) as SpotifyMeResponse) : null;
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("spotify_connections").upsert({
    user_id: user.id,
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
    scope: token.scope,
    token_type: token.token_type,
    spotify_user_id: me?.id ?? null,
    updated_at: new Date().toISOString(),
  });

  const response = NextResponse.redirect(
    dashboardRedirect(request, error ? "save_failed" : "connected"),
  );
  response.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
