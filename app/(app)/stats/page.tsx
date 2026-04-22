import Link from "next/link";
import { Users, Search as SearchIcon } from "lucide-react";
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

  const rosterWithRiot = ((members ?? []) as Array<Partial<UserRow>>).filter(
    (u) => u.riot_name && u.riot_tag,
  );
  const profiles = (profileRows ?? []) as PlayerProfileRow[];
  const recentProfiles = profiles.slice(0, 24);
  const profileIds = profiles.map((profile) => profile.id);
  const { data: trackedRows } = profileIds.length
    ? await supabase
        .from("tracked_stats")
        .select("*")
        .in("player_profile_id", profileIds)
        .order("played_at", { ascending: false })
    : { data: [] as TrackedStatRow[] };
  const teamStats = buildTeamStatsBundle({
    teamId: team.id,
    profiles,
    trackedStats: (trackedRows ?? []) as TrackedStatRow[],
    rosterLinkedCount: rosterWithRiot.length,
  });

  return (
    <div className="flex flex-col gap-6 max-w-[1400px]">
      <header>
        <div className="eyebrow">Stats Tracker</div>
        <h1 className="font-display text-3xl tracking-wide mt-1">Track any player</h1>
        <p className="text-[color:var(--color-muted)] mt-1">
          Search by Riot name and tag to pull live stats from HenrikDev. Team
          rosters surface automatically below.
        </p>
      </header>

      <PlayerSearch defaultRegion={defaultRegion()} />

      {(teamStats.overview.trackedProfiles > 0 || rosterWithRiot.length > 0) ? (
        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="eyebrow">Team snapshot</div>
              <p className="text-sm text-[color:var(--color-muted)] mt-1">
                Aggregated from each tracked player&rsquo;s recent Henrik-backed
                match history, with profile snapshot fallback when match rows
                are still thin.
              </p>
            </div>
            {teamStats.overview.lastSyncAt ? (
              <div className="text-xs text-[color:var(--color-muted)] text-right">
                Last sync {relativeTime(teamStats.overview.lastSyncAt)}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TeamMetricCard
              label="Tracked roster"
              value={teamStats.overview.trackedProfiles.toString()}
              detail={
                teamStats.overview.rosterLinkedCount > 0
                  ? `${teamStats.overview.rosterLinkedCount} linked · ${formatPercent(teamStats.overview.coveragePct, 0)} coverage`
                  : "Link Riot IDs to expand team coverage"
              }
            />
            <TeamMetricCard
              label="Match sample"
              value={teamStats.overview.sampledMatches.toString()}
              detail={`${teamStats.overview.playersWithSamples} players with tracked matches`}
            />
            <TeamMetricCard
              label="Form trend"
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
              label="Win rate"
              value={formatPercent(teamStats.averages.win_rate, 0)}
              detail="Per-player recent win rate average"
            />
            <TeamMetricCard
              label="HS%"
              value={formatPercent(teamStats.averages.headshot_pct, 0)}
              detail={`Fresh syncs ${teamStats.overview.syncedRecently}/${teamStats.overview.trackedProfiles || 0}`}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4">
            <div className="surface p-5">
              <div className="eyebrow">Team leaders</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                <LeaderRow
                  label="ACS leader"
                  leader={teamStats.leaders.acs}
                  value={formatWhole(teamStats.leaders.acs?.value ?? null)}
                />
                <LeaderRow
                  label="K/D leader"
                  leader={teamStats.leaders.kd_ratio}
                  value={formatDecimal(teamStats.leaders.kd_ratio?.value ?? null, 2)}
                />
                <LeaderRow
                  label="HS% leader"
                  leader={teamStats.leaders.headshot_pct}
                  value={formatPercent(teamStats.leaders.headshot_pct?.value ?? null, 0)}
                />
                <LeaderRow
                  label="Best WR"
                  leader={teamStats.leaders.win_rate}
                  value={formatPercent(teamStats.leaders.win_rate?.value ?? null, 0)}
                />
              </div>
            </div>

            <div className="surface p-5">
              <div className="eyebrow">Agent pool</div>
              {teamStats.agentPool.length > 0 ? (
                <div className="flex flex-col gap-3 mt-4">
                  {teamStats.agentPool.slice(0, 4).map((entry) => (
                    <div
                      key={entry.agent}
                      className="flex items-center justify-between gap-3 rounded-md border border-white/5 bg-white/[0.02] px-3 py-2"
                    >
                      <div>
                        <div className="font-display tracking-wide">{entry.agent}</div>
                        <div className="text-xs text-[color:var(--color-muted)]">
                          {entry.games} games · {formatPercent(entry.winRate, 0)} WR
                        </div>
                      </div>
                      <div className="text-sm text-[color:var(--color-muted)]">
                        {formatWhole(entry.acs)} ACS
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[color:var(--color-muted)] mt-3">
                  Agent usage appears once tracked match rows exist for the roster.
                </p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      <section>
        <div className="eyebrow mb-3">Roster — {team.name}</div>
        {rosterWithRiot.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Riot IDs linked yet"
            description="Team members can add their Riot name + tag from Players → Profile."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rosterWithRiot.map((u) => (
              <Link
                key={u.id}
                href={`/stats/${encodeURIComponent(u.riot_name!)}/${encodeURIComponent(u.riot_tag!)}?region=${u.riot_region ?? "eu"}`}
                className="surface p-4 flex items-center gap-4 hover-lift"
              >
                <div className="h-10 w-10 rounded-full border border-white/10 bg-white/5 grid place-items-center">
                  <SearchIcon className="h-4 w-4 text-[color:var(--color-muted)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display tracking-wide text-lg truncate">
                    {u.display_name ?? u.riot_name}
                  </div>
                  <div className="text-xs text-[color:var(--color-muted)] truncate">
                    {u.riot_name}#{u.riot_tag} · {(u.riot_region ?? "eu").toUpperCase()}
                  </div>
                </div>
                <span className="text-[color:var(--accent)] text-xs">Track →</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {recentProfiles.length > 0 ? (
        <section>
          <div className="eyebrow mb-3">Recently tracked</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {recentProfiles.map((p) => (
              <Link
                key={p.id}
                href={`/stats/${encodeURIComponent(p.riot_name)}/${encodeURIComponent(p.riot_tag)}?region=${p.region ?? "eu"}`}
                className="surface p-4 flex items-center justify-between gap-3 hover-lift"
              >
                <div className="min-w-0">
                  <div className="font-display tracking-wide text-lg truncate">
                    {p.riot_name}{" "}
                    <span className="text-[color:var(--color-muted)]">
                      #{p.riot_tag}
                    </span>
                  </div>
                  <div className="text-xs text-[color:var(--color-muted)]">
                    {p.last_synced_at
                      ? `Synced ${new Date(p.last_synced_at).toLocaleDateString()}`
                      : "Not synced yet"}
                  </div>
                </div>
                <RankBadge rank={p.current_rank} rr={p.current_rr ?? undefined} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
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
    <div className="surface p-4">
      <div className="eyebrow">{label}</div>
      <div className="stat-number mt-1">{value}</div>
      <div className="text-xs text-[color:var(--color-muted)] mt-2">{detail}</div>
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
    <div className="rounded-md border border-white/5 bg-white/[0.02] px-3 py-3">
      <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
        {label}
      </div>
      {leader ? (
        <>
          <div className="font-display tracking-wide text-lg mt-1">
            {leader.riotName}
            <span className="text-[color:var(--color-muted)]"> #{leader.riotTag}</span>
          </div>
          <div className="text-sm text-[color:var(--accent)] mt-1">{value}</div>
          <div className="text-xs text-[color:var(--color-muted)] mt-1">
            {leader.sampleSize > 0
              ? `${leader.sampleSize} tracked matches`
              : "Profile snapshot fallback"}
          </div>
        </>
      ) : (
        <div className="text-sm text-[color:var(--color-muted)] mt-2">
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
