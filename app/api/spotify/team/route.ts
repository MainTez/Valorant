import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  emptySpotifyState,
  getSpotifyTrackState,
  spotifyConfigured,
} from "@/lib/spotify";
import type { SpotifyConnectionRow } from "@/types/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TeamUserRow {
  id: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
}

export async function GET() {
  const { team } = await requireSession();
  const configured = spotifyConfigured();
  const admin = createSupabaseAdminClient();

  const { data: users, error: usersError } = await admin
    .from("users")
    .select("id, display_name, email, avatar_url")
    .eq("team_id", team.id)
    .order("display_name", { ascending: true });

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  const roster = (users ?? []) as TeamUserRow[];
  const userIds = roster.map((user) => user.id);
  const { data: connectionRows } = configured && userIds.length
    ? await admin
        .from("spotify_connections")
        .select("*")
        .in("user_id", userIds)
    : { data: [] as SpotifyConnectionRow[] };

  const connections = new Map(
    ((connectionRows ?? []) as SpotifyConnectionRow[]).map((connection) => [
      connection.user_id,
      connection,
    ]),
  );

  const players = await Promise.all(
    roster.map(async (user) => {
      const state = configured
        ? await getSpotifyTrackState(connections.get(user.id) ?? null, admin)
        : emptySpotifyState(false);
      return {
        userId: user.id,
        displayName: user.display_name ?? user.email.split("@")[0],
        avatarUrl: user.avatar_url,
        ...state,
      };
    }),
  );

  return NextResponse.json({ configured, players });
}
