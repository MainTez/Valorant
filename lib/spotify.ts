import "server-only";
import { Buffer } from "node:buffer";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpotifyConnectionRow } from "@/types/domain";

export interface SpotifyTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

export interface SpotifyTrackState {
  connected: boolean;
  playing: boolean;
  title: string | null;
  artist: string | null;
  albumArt: string | null;
  url: string | null;
  progressMs?: number | null;
  durationMs?: number | null;
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

export function spotifyConfigured() {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

export function spotifyRedirectUri(origin: string) {
  return process.env.SPOTIFY_REDIRECT_URI ?? new URL("/api/spotify/callback", origin).toString();
}

export function spotifyBasicAuthHeader() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export function emptySpotifyState(connected = false): SpotifyTrackState {
  return {
    connected,
    playing: false,
    title: null,
    artist: null,
    albumArt: null,
    url: null,
    progressMs: null,
    durationMs: null,
  };
}

export function shouldRefreshSpotifyConnection(connection: SpotifyConnectionRow) {
  if (!connection.access_token || !connection.expires_at) return true;
  return new Date(connection.expires_at).getTime() - Date.now() < 60_000;
}

export async function exchangeSpotifyCode({
  code,
  redirectUri,
}: {
  code: string;
  redirectUri: string;
}) {
  const auth = spotifyBasicAuthHeader();
  if (!auth) return null;

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) return null;
  return (await tokenRes.json()) as SpotifyTokenResponse;
}

export async function refreshSpotifyConnection(
  connection: SpotifyConnectionRow,
  supabase: SupabaseClient,
) {
  const auth = spotifyBasicAuthHeader();
  if (!auth) return null;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: auth,
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

async function fetchCurrentlyPlaying(accessToken: string) {
  return fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
}

export async function getSpotifyTrackState(
  connection: SpotifyConnectionRow | null,
  supabase: SupabaseClient,
): Promise<SpotifyTrackState> {
  if (!connection) return emptySpotifyState(false);

  if (shouldRefreshSpotifyConnection(connection)) {
    connection = await refreshSpotifyConnection(connection, supabase);
  }

  if (!connection?.access_token) {
    return emptySpotifyState(false);
  }

  let currentRes = await fetchCurrentlyPlaying(connection.access_token);
  if (currentRes.status === 401) {
    connection = await refreshSpotifyConnection(connection, supabase);
    if (connection?.access_token) currentRes = await fetchCurrentlyPlaying(connection.access_token);
  }

  if (currentRes.status === 204) {
    return emptySpotifyState(true);
  }

  if (!currentRes.ok) {
    return emptySpotifyState(true);
  }

  const payload = (await currentRes.json()) as SpotifyTrackPayload;
  const track = payload.item?.type === "track" ? payload.item : null;
  const images = track?.album?.images ?? [];
  const albumArt = images[1]?.url ?? images[0]?.url ?? null;

  return {
    connected: true,
    playing: Boolean(payload.is_playing && track),
    title: track?.name ?? null,
    artist: track?.artists?.map((artist) => artist.name).filter(Boolean).join(", ") ?? null,
    albumArt,
    url: track?.external_urls?.spotify ?? null,
    progressMs: payload.progress_ms ?? null,
    durationMs: track?.duration_ms ?? null,
  };
}
