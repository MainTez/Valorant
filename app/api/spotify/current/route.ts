import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SpotifyConnectionRow } from "@/types/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SpotifyTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

interface SpotifyTrackPayload {
  is_playing?: boolean;
  progress_ms?: number;
  item?: {
    type?: string;
    name?: string;
    duration_ms?: number;
    external_urls?: { spotify?: string };
    artists?: Array<{ name?: string }>;
    album?: {
      images?: Array<{ url: string; height?: number; width?: number }>;
    };
  } | null;
}

function notConfigured() {
  return NextResponse.json({
    configured: false,
    connected: false,
    playing: false,
    title: null,
    artist: null,
    albumArt: null,
    url: null,
  });
}

async function refreshConnection(
  connection: SpotifyConnectionRow,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
    }),
  });

  if (!res.ok) return null;

  const token = (await res.json()) as SpotifyTokenResponse;
  const nextConnection: SpotifyConnectionRow = {
    ...connection,
    access_token: token.access_token,
    refresh_token: token.refresh_token ?? connection.refresh_token,
    expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
    scope: token.scope ?? connection.scope,
    token_type: token.token_type ?? connection.token_type,
    updated_at: new Date().toISOString(),
  };

  await supabase
    .from("spotify_connections")
    .update({
      access_token: nextConnection.access_token,
      refresh_token: nextConnection.refresh_token,
      expires_at: nextConnection.expires_at,
      scope: nextConnection.scope,
      token_type: nextConnection.token_type,
      updated_at: nextConnection.updated_at,
    })
    .eq("user_id", connection.user_id);

  return nextConnection;
}

function shouldRefresh(connection: SpotifyConnectionRow) {
  if (!connection.access_token || !connection.expires_at) return true;
  return new Date(connection.expires_at).getTime() - Date.now() < 60_000;
}

async function fetchCurrentlyPlaying(accessToken: string) {
  return fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
}

export async function GET() {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    return notConfigured();
  }

  const { user } = await requireSession();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("spotify_connections")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  let connection = data as SpotifyConnectionRow | null;
  if (!connection) {
    return NextResponse.json({
      configured: true,
      connected: false,
      playing: false,
      title: null,
      artist: null,
      albumArt: null,
      url: null,
    });
  }

  if (shouldRefresh(connection)) {
    connection = await refreshConnection(connection, supabase);
  }

  if (!connection?.access_token) {
    return NextResponse.json({
      configured: true,
      connected: false,
      playing: false,
      title: null,
      artist: null,
      albumArt: null,
      url: null,
    });
  }

  let currentRes = await fetchCurrentlyPlaying(connection.access_token);
  if (currentRes.status === 401) {
    connection = await refreshConnection(connection, supabase);
    if (connection?.access_token) currentRes = await fetchCurrentlyPlaying(connection.access_token);
  }

  if (currentRes.status === 204) {
    return NextResponse.json({
      configured: true,
      connected: true,
      playing: false,
      title: null,
      artist: null,
      albumArt: null,
      url: null,
    });
  }

  if (!currentRes.ok) {
    return NextResponse.json({
      configured: true,
      connected: true,
      playing: false,
      title: null,
      artist: null,
      albumArt: null,
      url: null,
    });
  }

  const payload = (await currentRes.json()) as SpotifyTrackPayload;
  const track = payload.item?.type === "track" ? payload.item : null;
  const images = track?.album?.images ?? [];
  const albumArt = images[1]?.url ?? images[0]?.url ?? null;

  return NextResponse.json({
    configured: true,
    connected: true,
    playing: Boolean(payload.is_playing && track),
    title: track?.name ?? null,
    artist: track?.artists?.map((artist) => artist.name).filter(Boolean).join(", ") ?? null,
    albumArt,
    url: track?.external_urls?.spotify ?? null,
    progressMs: payload.progress_ms ?? null,
    durationMs: track?.duration_ms ?? null,
  });
}
