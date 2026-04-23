import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { teamBySlug, type TeamSlug } from "@/lib/constants";
import { NextMatchCard } from "@/components/dashboard/next-match-card";
import { RoutineCard } from "@/components/dashboard/routine-card";
import { FocusCard } from "@/components/dashboard/focus-card";
import { StatCards } from "@/components/dashboard/stat-cards";
import { UpcomingMatchCard } from "@/components/dashboard/upcoming-match-card";
import { ScheduleTimeline } from "@/components/dashboard/schedule-timeline";
import { ImportantNote } from "@/components/dashboard/important-note";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentMatches } from "@/components/dashboard/recent-matches";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import type {
  ActivityEventRow,
  MatchRow,
  PlayerProfileRow,
  RoutineProgressRow,
  RoutineRow,
  ScheduleEventRow,
  TeamNoteRow,
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
    { data: upcomingEvents },
    { data: todaysEvents },
    { data: recentMatches },
    { data: lastMatchRows },
    { data: profileRows },
    { data: routines },
    { data: progressRows },
    { data: focusNotes },
    { data: importantNotes },
    { data: activityRows },
    { data: membersRaw },
  ] = await Promise.all([
    supabase
      .from("schedule_events")
      .select("*")
      .eq("team_id", team.id)
      .gt("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(5),
    supabase
      .from("schedule_events")
      .select("*")
      .eq("team_id", team.id)
      .gte("start_at", startOfDay.toISOString())
      .lte("start_at", endOfDay.toISOString())
      .order("start_at", { ascending: true }),
    supabase
      .from("matches")
      .select("*")
      .eq("team_id", team.id)
      .order("date", { ascending: false })
      .limit(5),
    supabase
      .from("matches")
      .select("*")
      .eq("team_id", team.id)
      .order("date", { ascending: false })
      .limit(1),
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
      .from("team_notes")
      .select("*")
      .eq("team_id", team.id)
      .eq("pinned", true)
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

  const nextMatchEvent =
    ((upcomingEvents ?? []) as ScheduleEventRow[]).find(
      (event) => event.kind === "match" || event.kind === "scrim",
    ) ?? ((upcomingEvents ?? []) as ScheduleEventRow[])[0] ?? null;

  const upcomingMatch =
    ((upcomingEvents ?? []) as ScheduleEventRow[]).find(
      (event) => event.kind === "match" || event.kind === "scrim",
    ) ?? null;

  const lastMatch = ((lastMatchRows ?? []) as MatchRow[])[0] ?? null;
  const recentResults = ((recentMatches ?? []) as MatchRow[]).map((match) => match.result);
  const winTrend = buildWinTrend(recentResults);
  const focus = ((focusNotes ?? []) as TeamNoteRow[])[0] ?? null;
  const important = ((importantNotes ?? []) as TeamNoteRow[])[0] ?? focus ?? null;

  const teamSlug: TeamSlug =
    (teamBySlug(team.slug)?.slug as TeamSlug) ?? "surf-n-bulls";

  const routine = ((routines ?? []) as RoutineRow[])[0] ?? null;
  const progress =
    (((progressRows ?? []) as RoutineProgressRow[]).find(
      (row) => row.routine_id === routine?.id,
    )) ?? null;

  const members = (membersRaw ?? []) as Array<
    Pick<UserRow, "id" | "display_name" | "avatar_url" | "email">
  >;
  const membersById = Object.fromEntries(members.map((member) => [member.id, member]));

  const activity = ((activityRows ?? []) as ActivityEventRow[]).map((event) => ({
    ...event,
    actor: event.actor_id ? membersById[event.actor_id] ?? null : null,
  }));

  return (
    <div className="flex max-w-[1400px] flex-col gap-5">
      <header>
        <div className="font-display text-4xl tracking-wide">
          Welcome back,{" "}
          <span className="accent-text">
            {user.display_name ?? user.email.split("@")[0]}
          </span>
        </div>
        <p className="mt-1 text-[color:var(--color-muted)]">Let&rsquo;s win today.</p>
        <div className="mt-3 h-[2px] w-16 rounded-full bg-[color:var(--accent)] shadow-[0_0_10px_var(--accent)]" />
      </header>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr_1fr]">
        <NextMatchCard
          team={teamSlug}
          teamName={team.name}
          event={nextMatchEvent}
        />
        <RoutineCard routine={routine} progress={progress} />
        <FocusCard note={focus} />
      </section>

      <section>
        <StatCards
          lastMatch={lastMatch}
          profile={((profileRows ?? null) as PlayerProfileRow | null) ?? null}
          recentResults={recentResults}
          winTrend={winTrend}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.3fr_1fr]">
        <UpcomingMatchCard event={upcomingMatch} />
        <ScheduleTimeline events={(todaysEvents ?? []) as ScheduleEventRow[]} />
        <div className="grid grid-rows-[1fr_auto] gap-4">
          <ImportantNote note={important} />
          <QuickActions />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <RecentMatches matches={(recentMatches ?? []) as MatchRow[]} />
        <RecentActivity events={activity} />
      </section>
    </div>
  );
}

function buildWinTrend(results: Array<"win" | "loss" | "draw">): number[] {
  const ordered = [...results].reverse();
  const trend: number[] = [];
  let wins = 0;
  let decided = 0;

  for (const result of ordered) {
    if (result === "win") {
      wins += 1;
      decided += 1;
    } else if (result === "loss") {
      decided += 1;
    }
    trend.push(decided === 0 ? 0 : wins / decided);
  }

  return trend;
}
