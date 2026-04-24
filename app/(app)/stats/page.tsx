import Link from "next/link";
import { UserRound, Users, Search as SearchIcon } from "lucide-react";
import { requireSession } from "@/lib/auth/get-session";
import {
  buildTeamStatsBundle,
  type TeamStatLeader,
} from "@/lib/stats/team";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PlayerSearch } from "@/components/stats/player-search";
import { EmptyState } from "@/components/common/empty-state";
import { RankBadge } from "@/components/common/rank-badge";
import { defaultRegion } from "@/lib/henrik/regions";
import { relativeTime } from "@/lib/utils";
import type { PlayerProfileRow, TrackedStatRow, UserRow } from "@/types/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stats Tracker" };

export default async function StatsIndexPage() {
  const { team } = await requireSession();
  const supabase = await createSupabaseServerClient();

  const [{ data: profileRows }, { data: members }] = await Promise.all([
    supabase
      .from("player_profiles")
      .select("*")
      .eq("team_id", team.id)
      .order("last_synced_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("users")
      .select("id, display_name, avatar_url, email, riot_name, riot_tag, riot_region")
      .eq("team_id", team.id),
  ]);

  const teamMembers = (members ?? []) as Array<Partial<UserRow>>;
  const rosterWithRiot = teamMembers.filter(
    (u) => u.riot_name && u.riot_tag,
  );
  const profiles = (profileRows ?? []) as PlayerProfileRow[];
  const recentProfiles = profiles.slice(0, 24);
  const rosterUserIds = new Set(teamMembers.map((member) => member.id).filter(Boolean));
  const rosterRiotKeys = new Set(
    rosterWithRiot.map((member) =>
      `${member.riot_name!.toLowerCase()}#${member.riot_tag!.toLowerCase()}`,
    ),
  );
  const rosterProfiles = profiles.filter((profile) => {
    const key = `${profile.riot_name.toLowerCase()}#${profile.riot_tag.toLowerCase()}`;
    return (
      (profile.user_id != null && rosterUserIds.has(profile.user_id)) ||
      rosterRiotKeys.has(key)
    );
  });
  const profileIds = rosterProfiles.map((profile) => profile.id);
  const { data: trackedRows } = profileIds.length
    ? await supabase
        .from("tracked_stats")
        .select("*")
        .in("player_profile_id", profileIds)
        .order("played_at", { ascending: false })
    : { data: [] as TrackedStatRow[] };
  const teamStats = buildTeamStatsBundle({
    teamId: team.id,
    profiles: rosterProfiles,
    trackedStats: (trackedRows ?? []) as TrackedStatRow[],
    rosterLinkedCount: rosterWithRiot.length,
  });

  return (
    <div className="flex max-w-[1480px] flex-col gap-5">
      <section className="relative overflow-hidden rounded-[1.6rem] border border-white/7 bg-[linear-gradient(180deg,rgba(19,22,29,0.96)_0%,rgba(10,12,17,0.99)_100%)] px-6 py-7 shadow-[0_28px_72px_-44px_rgba(0,0,0,0.95)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_left_top,rgba(246,196,83,0.18),transparent_30%),radial-gradient(circle_at_right_top,rgba(61,160,255,0.12),transparent_24%),linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_50%,transparent_100%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.02fr_0.98fr] xl:items-end">
          <div>
            <div className="eyebrow text-white/45">Stats Tracker</div>
            <h1 className="mt-2 font-display text-[clamp(2.3rem,3.6vw,4rem)] leading-[0.95] tracking-[0.03em] text-white">
              Track any player.
              <span className="block text-gold-metal">Build a real team snapshot.</span>
            </h1>
            <p className="mt-3 max-w-[34rem] text-sm leading-7 text-white/56 sm:text-base">
              Search by Riot ID to open the new tracker layout, then compare it
              against your linked roster. External searches stay in recently
              tracked without changing the team snapshot.
            </p>
          </div>
          <PlayerSearch defaultRegion={defaultRegion()} />
        </div>
      </section>

      {(teamStats.overview.trackedProfiles > 0 || rosterWithRiot.length > 0) ? (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <StatsPanel className="xl:col-span-12">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="eyebrow">Team Snapshot</div>
                  <p className="mt-1 text-sm text-white/48">
                    Aggregated from tracked roster matches, with profile
                    snapshot fallback when the team sample is still thin.
                  </p>
                </div>
                {teamStats.overview.lastSyncAt ? (
                  <div className="text-xs text-white/36">
                    Last sync {relativeTime(teamStats.overview.lastSyncAt)}
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
                <TeamMetricCard
                  label="Tracked Roster"
                  value={teamStats.overview.trackedProfiles.toString()}
                  detail={
                    teamStats.overview.rosterLinkedCount > 0
                      ? `${teamStats.overview.rosterLinkedCount} linked · ${formatPercent(teamStats.overview.coveragePct, 0)} coverage`
                      : "Link Riot IDs to expand coverage"
                  }
                />
                <TeamMetricCard
                  label="Match Sample"
                  value={teamStats.overview.sampledMatches.toString()}
                  detail={`${teamStats.overview.playersWithSamples} players with tracked matches`}
                />
                <TeamMetricCard
                  label="Form Trend"
                  value={formatSignedPercent(teamStats.trend.momentum_pct)}
                  detail={
                    teamStats.trend.recent_win_rate != null
                      ? `Recent WR ${formatPercent(teamStats.trend.recent_win_rate, 0)}`
                      : "Need more tracked recent form"
                  }
                />
                <TeamMetricCard
                  label="ADR"
                  value={formatWhole(teamStats.combat.adr)}
                  detail={formatKdaLine(teamStats)}
                />
                <TeamMetricCard
                  label="Team ACS"
                  value={formatWhole(teamStats.averages.acs)}
                  detail="Equal-weighted across tracked players"
                />
                <TeamMetricCard
                  label="Team K/D"
                  value={formatDecimal(teamStats.averages.kd_ratio, 2)}
                  detail="Recent player sample average"
                />
                <TeamMetricCard
                  label="Win Rate"
                  value={formatPercent(teamStats.averages.win_rate, 0)}
                  detail="Per-player recent win rate average"
                />
                <TeamMetricCard
                  label="HS%"
                  value={formatPercent(teamStats.averages.headshot_pct, 0)}
                  detail={`Fresh syncs ${teamStats.overview.syncedRecently}/${teamStats.overview.trackedProfiles || 0}`}
                />
              </div>
            </div>
          </StatsPanel>

          <StatsPanel className="xl:col-span-7">
            <div className="eyebrow">Team Leaders</div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <LeaderRow
                label="ACS Leader"
                leader={teamStats.leaders.acs}
                value={formatWhole(teamStats.leaders.acs?.value ?? null)}
              />
              <LeaderRow
                label="K/D Leader"
                leader={teamStats.leaders.kd_ratio}
                value={formatDecimal(teamStats.leaders.kd_ratio?.value ?? null, 2)}
              />
              <LeaderRow
                label="HS% Leader"
                leader={teamStats.leaders.headshot_pct}
                value={formatPercent(teamStats.leaders.headshot_pct?.value ?? null, 0)}
              />
              <LeaderRow
                label="Best WR"
                leader={teamStats.leaders.win_rate}
                value={formatPercent(teamStats.leaders.win_rate?.value ?? null, 0)}
              />
            </div>
          </StatsPanel>

          <StatsPanel className="xl:col-span-5">
            <div className="eyebrow">Agent Pool</div>
            {teamStats.agentPool.length > 0 ? (
              <div className="mt-4 flex flex-col gap-3">
                {teamStats.agentPool.slice(0, 4).map((entry) => (
                  <div
                    key={entry.agent}
                    className="flex items-center justify-between gap-3 rounded-[1rem] border border-white/6 bg-white/[0.025] px-4 py-3"
                  >
                    <div>
                      <div className="font-display text-lg tracking-[0.04em]">
                        {entry.agent}
                      </div>
                      <div className="text-xs text-white/38">
                        {entry.games} games · {formatPercent(entry.winRate, 0)} WR
                      </div>
                    </div>
                    <div className="font-display text-lg">{formatWhole(entry.acs)} ACS</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-white/42">
                Agent usage appears once tracked match rows exist for the roster.
              </p>
            )}
          </StatsPanel>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <StatsPanel className="xl:col-span-7">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div className="eyebrow">Roster — {team.name}</div>
            <div className="text-xs text-white/36">{rosterWithRiot.length} linked players</div>
          </div>
          {rosterWithRiot.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Riot IDs linked yet"
              description="Team members can add their Riot name + tag from Players → Profile."
              action={
                <Link href="/players/profile" className="btn-ghost">
                  <UserRound className="h-4 w-4" />
                  Open Profile
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {rosterWithRiot.map((user) => (
                <Link
                  key={user.id}
                  href={`/stats/${encodeURIComponent(user.riot_name!)}/${encodeURIComponent(user.riot_tag!)}?region=${user.riot_region ?? "eu"}`}
                  className="group relative overflow-hidden rounded-[1.1rem] border border-white/7 bg-[linear-gradient(180deg,rgba(17,20,27,0.94)_0%,rgba(10,12,17,0.98)_100%)] p-4 transition hover:border-[color:var(--accent-soft)]"
                >
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.03),transparent_45%,rgba(255,255,255,0.015))]" />
                  <div className="relative flex items-center gap-4">
                    <div className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5">
                      <SearchIcon className="h-4 w-4 text-white/46" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-lg tracking-[0.04em]">
                        {user.display_name ?? user.riot_name}
                      </div>
                      <div className="truncate text-xs text-white/38">
                        {user.riot_name}#{user.riot_tag} · {(user.riot_region ?? "eu").toUpperCase()}
                      </div>
                    </div>
                    <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--accent)]">
                      Track →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </StatsPanel>

        <StatsPanel className="xl:col-span-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div className="eyebrow">Recently Tracked</div>
            <div className="text-xs text-white/36">{Math.min(recentProfiles.length, 5)} recent profiles</div>
          </div>
          {recentProfiles.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {recentProfiles.slice(0, 5).map((profile) => (
                <Link
                  key={profile.id}
                  href={`/stats/${encodeURIComponent(profile.riot_name)}/${encodeURIComponent(profile.riot_tag)}?region=${profile.region ?? "eu"}`}
                  className="group flex items-center justify-between gap-4 rounded-[1rem] border border-white/7 bg-white/[0.025] px-4 py-3 transition hover:border-[color:var(--accent-soft)]"
                >
                  <div className="min-w-0">
                    <div className="truncate font-display text-lg tracking-[0.04em]">
                      {profile.riot_name}
                      <span className="text-white/38"> #{profile.riot_tag}</span>
                    </div>
                    <div className="text-xs text-white/38">
                      {profile.last_synced_at
                        ? `Synced ${new Date(profile.last_synced_at).toLocaleDateString()}`
                        : "Not synced yet"}
                    </div>
                  </div>
                  <RankBadge
                    rank={profile.current_rank}
                    rr={profile.current_rr ?? undefined}
                    className="min-w-[152px] justify-end"
                  />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/42">Tracked players will appear here after the first sync.</p>
          )}
        </StatsPanel>
      </section>
    </div>
  );
}

function StatsPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-[1.35rem] border border-white/7 bg-[linear-gradient(180deg,rgba(19,22,29,0.96)_0%,rgba(11,13,19,0.98)_100%)] p-5 shadow-[0_24px_60px_-42px_rgba(0,0,0,0.95)] ${className ?? ""}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.03),transparent_42%,rgba(255,255,255,0.015)_100%)]" />
      <div className="relative">{children}</div>
    </section>
  );
}

function TeamMetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1rem] border border-white/7 bg-white/[0.025] p-4">
      <div className="text-[0.66rem] uppercase tracking-[0.2em] text-white/34">{label}</div>
      <div className="mt-2 font-display text-[2rem] leading-none tracking-[0.03em]">{value}</div>
      <div className="mt-3 text-xs leading-5 text-white/40">{detail}</div>
    </div>
  );
}

function LeaderRow({
  label,
  leader,
  value,
}: {
  label: string;
  leader: TeamStatLeader | null;
  value: string;
}) {
  return (
    <div className="rounded-[1rem] border border-white/7 bg-white/[0.025] px-4 py-4">
      <div className="text-[0.66rem] uppercase tracking-[0.2em] text-white/34">
        {label}
      </div>
      {leader ? (
        <>
          <div className="mt-2 font-display text-xl tracking-[0.04em]">
            {leader.riotName}
            <span className="text-white/36"> #{leader.riotTag}</span>
          </div>
          <div className="mt-2 text-sm text-[color:var(--accent)]">{value}</div>
          <div className="mt-2 text-xs text-white/38">
            {leader.sampleSize > 0
              ? `${leader.sampleSize} tracked matches`
              : "Profile snapshot fallback"}
          </div>
        </>
      ) : (
        <div className="mt-2 text-sm text-white/42">
          Not enough data yet.
        </div>
      )}
    </div>
  );
}

function formatWhole(value: number | null): string {
  return value != null ? Math.round(value).toString() : "—";
}

function formatDecimal(value: number | null, digits: number): string {
  return value != null ? value.toFixed(digits) : "—";
}

function formatPercent(value: number | null, digits: number): string {
  return value != null ? `${value.toFixed(digits)}%` : "—";
}

function formatSignedPercent(value: number | null): string {
  if (value == null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(0)}%`;
}

function formatKdaLine(teamStats: ReturnType<typeof buildTeamStatsBundle>): string {
  const { kills_per_match, deaths_per_match, assists_per_match } = teamStats.combat;
  if (
    kills_per_match == null ||
    deaths_per_match == null ||
    assists_per_match == null
  ) {
    return "Per-match combat fills in as tracked rows land";
  }

  return `${kills_per_match.toFixed(1)} / ${deaths_per_match.toFixed(1)} / ${assists_per_match.toFixed(1)} KDA`;
}
