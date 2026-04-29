import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createMatchMomentsForProfile } from "@/lib/desktop/match-moment-service";
import { syncPlayerProfileFromHenrik } from "@/lib/stats/player-profile-sync";
import type { MatchMomentRow, PlayerProfileRow, UserRow } from "@/types/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const POLL_WINDOW_MS = 20_000;
const FIRST_RUN_LOOKBACK_MS = 45 * 60 * 1000;
const OVERLAP_MS = 2 * 60 * 1000;
const BACKOFF_MS = 90_000;

interface SyncStateRow {
  team_id: string;
  last_polled_at: string | null;
  backoff_until: string | null;
  last_error: string | null;
}

export async function POST() {
  try {
    const { team } = await requireSession();
    const admin = createSupabaseAdminClient();
    const state = await loadSyncState(team.id);
    const now = Date.now();

    if (state.backoff_until && new Date(state.backoff_until).getTime() > now) {
      return NextResponse.json({
        data: {
          synced: false,
          reason: "backoff",
          moments: await loadRecentMoments(team.id),
        },
      });
    }

    if (state.last_polled_at && now - new Date(state.last_polled_at).getTime() < POLL_WINDOW_MS) {
      return NextResponse.json({
        data: {
          synced: false,
          reason: "fresh",
          moments: await loadRecentMoments(team.id),
        },
      });
    }

    await admin.from("desktop_sync_state").upsert({
      team_id: team.id,
      last_polled_at: new Date(now).toISOString(),
      backoff_until: null,
      last_error: null,
    });

    const since = state.last_polled_at
      ? new Date(new Date(state.last_polled_at).getTime() - OVERLAP_MS)
      : new Date(now - FIRST_RUN_LOOKBACK_MS);
    const supabase = await createSupabaseServerClient();
    const [{ data: users }, { data: profiles }] = await Promise.all([
      supabase
        .from("users")
        .select("*")
        .eq("team_id", team.id)
        .not("riot_name", "is", null)
        .not("riot_tag", "is", null),
      supabase.from("player_profiles").select("*").eq("team_id", team.id),
    ]);

    const profileByRiot = new Map(
      ((profiles ?? []) as PlayerProfileRow[]).map((profile) => [
        riotKey(profile.riot_name, profile.riot_tag),
        profile,
      ]),
    );
    const created: MatchMomentRow[] = [];
    const errors: string[] = [];

    for (const rosterUser of (users ?? []) as UserRow[]) {
      if (!rosterUser.riot_name || !rosterUser.riot_tag) continue;
      const profile = profileByRiot.get(riotKey(rosterUser.riot_name, rosterUser.riot_tag));

      try {
        const result = await syncPlayerProfileFromHenrik({
          profile,
          userId: rosterUser.id,
          teamId: team.id,
          riotName: rosterUser.riot_name,
          riotTag: rosterUser.riot_tag,
          region: rosterUser.riot_region ?? profile?.region ?? "eu",
          force: true,
          matchLimit: 5,
        });

        created.push(
          ...(await createMatchMomentsForProfile({
            teamId: team.id,
            userId: rosterUser.id,
            playerName: rosterUser.display_name ?? rosterUser.riot_name,
            profile: result.profile,
            matches: result.matches,
            since,
          })),
        );
      } catch (err) {
        errors.push(err instanceof Error ? err.message : "Unknown sync error");
      }
    }

    if (errors.length > 0) {
      await admin.from("desktop_sync_state").upsert({
        team_id: team.id,
        last_polled_at: new Date(now).toISOString(),
        backoff_until: new Date(now + BACKOFF_MS).toISOString(),
        last_error: errors.slice(0, 3).join(" | "),
      });
    }

    return NextResponse.json({
      data: {
        synced: true,
        reason: errors.length > 0 ? "partial" : "ok",
        created: created.length,
        moments: created.length > 0 ? created : await loadRecentMoments(team.id),
        errors,
      },
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}

async function loadSyncState(teamId: string): Promise<SyncStateRow> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("desktop_sync_state")
    .select("*")
    .eq("team_id", teamId)
    .maybeSingle();

  return (data as SyncStateRow | null) ?? {
    team_id: teamId,
    last_polled_at: null,
    backoff_until: null,
    last_error: null,
  };
}

async function loadRecentMoments(teamId: string): Promise<MatchMomentRow[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("match_moments")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(12);

  return (data ?? []) as MatchMomentRow[];
}

function riotKey(name: string, tag: string): string {
  return `${name.toLowerCase()}#${tag.toLowerCase().replace(/^#/, "")}`;
}
