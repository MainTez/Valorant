import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { teamBySlug, type TeamSlug } from "@/lib/constants";
import { TrackerDashboard } from "@/components/dashboard/tracker-dashboard";
import { filterCoreStatsMatches } from "@/lib/stats/match-filters";
import type {
  ActivityEventRow,
  PlayerProfileRow,
  RoutineProgressRow,
  RoutineRow,
  ScheduleEventRow,
  TeamNoteRow,
  TrackedStatRow,
  UserRow,
} from "@/types/domain";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { user, team } = await requireSession();
  const supabase = await createSupabaseServerClient();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: upcomingEventsRaw },
    { data: recentProfileRaw },
    { data: routinesRaw },
    { data: progressRowsRaw },
    { data: focusNotesRaw },
    { data: activityRowsRaw },
    { data: membersRaw },
  ] = await Promise.all([
    supabase
      .from("schedule_events")
      .select("*")
      .eq("team_id", team.id)
      .gt("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(5),
    user.riot_name && user.riot_tag
      ? supabase
          .from("player_profiles")
          .select("*")
          .eq("riot_name", user.riot_name)
          .eq("riot_tag", user.riot_tag)
          .maybeSingle()
      : Promise.resolve({ data: null as PlayerProfileRow | null }),
    supabase
      .from("routines")
      .select("*")
      .eq("team_id", team.id)
      .eq("scope", "daily")
      .order("created_at", { ascending: true })
      .limit(1),
    supabase
      .from("routine_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today),
    supabase
      .from("team_notes")
      .select("*")
      .eq("team_id", team.id)
      .eq("kind", "weekly_focus")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("activity_events")
      .select("*")
      .eq("team_id", team.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("users")
      .select("id, display_name, avatar_url, email")
      .eq("team_id", team.id),
  ]);

  const profile = (recentProfileRaw ?? null) as PlayerProfileRow | null;
  const { data: trackedRowsRaw } = profile
    ? await supabase
        .from("tracked_stats")
        .select("*")
        .eq("player_profile_id", profile.id)
        .order("played_at", { ascending: false })
        .limit(80)
    : { data: [] as TrackedStatRow[] };

  const trackedRows = filterCoreStatsMatches((trackedRowsRaw ?? []) as TrackedStatRow[]);
  const recentPerformanceWindow = trackedRows.slice(0, 20);
  const recentPerformance = recentPerformanceWindow
    .slice()
    .reverse()
    .map((row, index) => ({
      label: `${index + 1}`,
      acs: row.acs ?? 0,
      kd: ratio(row.kills, row.deaths),
      adr: row.adr ?? 0,
      hs: row.headshot_pct ?? 0,
      result: normalizeResult(row.result),
    }));

  const recentSummary = {
    wins: recentPerformanceWindow.filter((row) => row.result === "win").length,
    losses: recentPerformanceWindow.filter((row) => row.result === "loss").length,
    draws: recentPerformanceWindow.filter((row) => row.result === "draw").length,
    kd: average(
      recentPerformanceWindow.map((row) => ratio(row.kills, row.deaths)).filter(isFiniteNumber),
      2,
    ),
    adr: average(
      recentPerformanceWindow.map((row) => row.adr).filter(isFiniteNumber),
      1,
    ),
    acs: average(
      recentPerformanceWindow.map((row) => row.acs).filter(isFiniteNumber),
      1,
    ),
    hs: average(
      recentPerformanceWindow.map((row) => row.headshot_pct).filter(isFiniteNumber),
      1,
    ),
  };

  const wins = trackedRows.filter((row) => row.result === "win").length;
  const losses = trackedRows.filter((row) => row.result === "loss").length;
  const decided = wins + losses;
  const overview = {
    matchesPlayed: trackedRows.length,
    wins,
    winRate: decided > 0 ? Number(((wins / decided) * 100).toFixed(1)) : null,
    kd: average(trackedRows.map((row) => ratio(row.kills, row.deaths)).filter(isFiniteNumber), 2),
    adr: average(trackedRows.map((row) => row.adr).filter(isFiniteNumber), 1),
    acs: average(trackedRows.map((row) => row.acs).filter(isFiniteNumber), 1),
    headshot: average(
      trackedRows.map((row) => row.headshot_pct).filter(isFiniteNumber),
      1,
    ),
  };

  const agentStats = [...groupByKey(trackedRows, (row) => row.agent ?? "Unknown").entries()]
    .map(([agent, rows]) => {
      const agentWins = rows.filter((row) => row.result === "win").length;
      const agentLosses = rows.filter((row) => row.result === "loss").length;
      const agentDecided = agentWins + agentLosses;
      return {
        agent,
        games: rows.length,
        winRate: agentDecided > 0 ? Number(((agentWins / agentDecided) * 100).toFixed(1)) : 0,
        acs: average(rows.map((row) => row.acs).filter(isFiniteNumber), 0),
      };
    })
    .sort((a, b) => b.games - a.games || (b.acs ?? 0) - (a.acs ?? 0));

  const mapStats = [...groupByKey(trackedRows, (row) => row.map ?? "Unknown").entries()]
    .map(([map, rows]) => {
      const mapWins = rows.filter((row) => row.result === "win").length;
      const mapLosses = rows.filter((row) => row.result === "loss").length;
      const mapDecided = mapWins + mapLosses;
      return {
        map,
        matches: rows.length,
        winRate: mapDecided > 0 ? Number(((mapWins / mapDecided) * 100).toFixed(1)) : 0,
        kd: average(rows.map((row) => ratio(row.kills, row.deaths)).filter(isFiniteNumber), 2),
      };
    })
    .sort((a, b) => b.matches - a.matches || (b.kd ?? 0) - (a.kd ?? 0));

  const recentMatches = recentPerformanceWindow.slice(0, 5).map((row) => ({
    id: row.id,
    agent: row.agent,
    map: row.map,
    playedAt: row.played_at,
    result: normalizeResult(row.result),
    scoreTeam: row.score_team,
    scoreOpponent: row.score_opponent,
    kills: row.kills,
    deaths: row.deaths,
    assists: row.assists,
    acs: row.acs,
  }));

  const teamSlug: TeamSlug =
    (teamBySlug(team.slug)?.slug as TeamSlug) ?? "surf-n-bulls";

  const routine = ((routinesRaw ?? []) as RoutineRow[])[0] ?? null;
  const progress =
    (((progressRowsRaw ?? []) as RoutineProgressRow[]).find(
      (row) => row.routine_id === routine?.id,
    )) ?? null;
  const completed = new Set(progress?.completed_items ?? []);
  const routineData = routine
    ? {
        title: routine.title,
        done: routine.items.filter((item) => completed.has(item.id)).length,
        total: routine.items.length,
        items: routine.items.map((item) => ({
          label: item.label,
          done: completed.has(item.id),
        })),
      }
    : null;

  const focus = ((focusNotesRaw ?? []) as TeamNoteRow[])[0] ?? null;

  const members = (membersRaw ?? []) as Array<
    Pick<UserRow, "id" | "display_name" | "avatar_url" | "email">
  >;
  const membersById = Object.fromEntries(members.map((member) => [member.id, member]));
  const activity = ((activityRowsRaw ?? []) as ActivityEventRow[]).map((event) => {
    const actor = event.actor_id ? membersById[event.actor_id] ?? null : null;
    return {
      id: event.id,
      who: actor?.display_name ?? actor?.email?.split("@")[0] ?? "Someone",
      avatarUrl: actor?.avatar_url ?? null,
      verb: verbLabel(event.verb),
      createdAt: event.created_at,
    };
  });

  const upcomingMatch =
    ((upcomingEventsRaw ?? []) as ScheduleEventRow[]).find(
      (event) => event.kind === "match" || event.kind === "scrim",
    ) ??
    ((upcomingEventsRaw ?? []) as ScheduleEventRow[])[0] ??
    null;

  return (
    <TrackerDashboard
      userName={user.display_name ?? user.email.split("@")[0]}
      userRole={user.role}
      teamName={team.name}
      teamSlug={teamSlug}
      profile={
        profile
          ? {
              rank: profile.current_rank,
              rr: profile.current_rr,
              peakRank: profile.peak_rank,
              lastSyncedAt: profile.last_synced_at,
            }
          : null
      }
      recentPerformance={recentPerformance}
      recentSummary={recentSummary}
      overview={overview}
      agentStats={agentStats}
      mapStats={mapStats}
      recentMatches={recentMatches}
      routine={routineData}
      focusNote={
        focus
          ? {
              title: focus.title,
              body: focus.body,
            }
          : null
      }
      activity={activity}
      upcomingMatch={
        upcomingMatch
          ? {
              title: upcomingMatch.title,
              kind: upcomingMatch.kind,
              startAt: upcomingMatch.start_at,
              location: upcomingMatch.location,
              participants: upcomingMatch.participants?.length ?? 0,
            }
          : null
      }
    />
  );
}

function average(values: number[], digits: number): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Number(total.toFixed(digits));
}

function ratio(kills: number | null, deaths: number | null): number {
  if (!isFiniteNumber(kills) || !isFiniteNumber(deaths)) return 0;
  if (deaths === 0) return kills;
  return Number((kills / deaths).toFixed(2));
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function groupByKey<T>(rows: T[], getKey: (row: T) => string) {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const key = getKey(row);
    const bucket = grouped.get(key) ?? [];
    bucket.push(row);
    grouped.set(key, bucket);
  }
  return grouped;
}

function normalizeResult(
  result: "win" | "loss" | "draw" | null,
): "win" | "loss" | "draw" | "neutral" {
  return result ?? "neutral";
}

function verbLabel(verb: string) {
  const labels: Record<string, string> = {
    uploaded_vod: "uploaded a VOD",
    logged_match: "logged a match",
    completed_routine: "completed the routine",
    added_note: "added a note",
    updated_task: "updated a task",
    whitelisted_user: "added a member",
    signin: "signed in",
  };

  return labels[verb] ?? verb.replace(/_/g, " ");
}
