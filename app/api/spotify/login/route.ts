import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/get-session";

export const runtime = "nodejs";

const STATE_COOKIE = "spotify_oauth_state";
const SPOTIFY_SCOPES = ["user-read-currently-playing", "user-read-playback-state"];

export async function GET(request: NextRequest) {
  await requireSession();

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "spotify_not_configured" }, { status: 500 });
  }

  const state = randomBytes(18).toString("base64url");
  const redirectUri =
    process.env.SPOTIFY_REDIRECT_URI ??
    new URL("/api/spotify/callback", request.nextUrl.origin).toString();

  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", SPOTIFY_SCOPES.join(" "));
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("show_dialog", "false");

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });

  return response;
}
