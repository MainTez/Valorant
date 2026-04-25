import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  exchangeSpotifyCode,
  spotifyConfigured,
  spotifyRedirectUri,
} from "@/lib/spotify";

export const runtime = "nodejs";

const STATE_COOKIE = "spotify_oauth_state";

interface SpotifyMeResponse {
  id?: string;
}

function profileRedirect(request: NextRequest, status: string) {
  const url = new URL("/players/profile", request.url);
  url.searchParams.set("spotify", status);
  return url;
}

export async function GET(request: NextRequest) {
  const { user } = await requireSession();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !savedState || state !== savedState) {
    const response = NextResponse.redirect(profileRedirect(request, "state_failed"));
    response.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }

  if (!spotifyConfigured()) {
    const response = NextResponse.redirect(profileRedirect(request, "not_configured"));
    response.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }

  const redirectUri = spotifyRedirectUri(request.nextUrl.origin);
  const token = await exchangeSpotifyCode({ code, redirectUri });
  if (!token) {
    const response = NextResponse.redirect(profileRedirect(request, "token_failed"));
    response.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("spotify_connections")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();
  const refreshToken =
    token.refresh_token ?? (existing as { refresh_token?: string } | null)?.refresh_token;

  if (!refreshToken) {
    const response = NextResponse.redirect(profileRedirect(request, "refresh_missing"));
    response.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }

  const meRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const me = meRes.ok ? ((await meRes.json()) as SpotifyMeResponse) : null;

  const { error } = await supabase.from("spotify_connections").upsert({
    user_id: user.id,
    access_token: token.access_token,
    refresh_token: refreshToken,
    expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
    scope: token.scope,
    token_type: token.token_type,
    spotify_user_id: me?.id ?? null,
    updated_at: new Date().toISOString(),
  });

  const response = NextResponse.redirect(
    profileRedirect(request, error ? "save_failed" : "connected"),
  );
  response.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
