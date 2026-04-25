import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  emptySpotifyState,
  getSpotifyTrackState,
  spotifyConfigured,
} from "@/lib/spotify";
import type { SpotifyConnectionRow } from "@/types/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function notConfigured() {
  return NextResponse.json({
    configured: false,
    ...emptySpotifyState(false),
  });
}

export async function GET() {
  if (!spotifyConfigured()) {
    return notConfigured();
  }

  const { user } = await requireSession();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("spotify_connections")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const connection = data as SpotifyConnectionRow | null;
  const state = await getSpotifyTrackState(connection, supabase);
  return NextResponse.json({
    configured: true,
    ...state,
  });
}
