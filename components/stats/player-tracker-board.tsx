"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BrainCircuit,
  Flame,
  Hash,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { RankBadge } from "@/components/common/rank-badge";
import { cn, fmtInt, fmtNumber, relativeTime } from "@/lib/utils";
import { filterCoreStatsMatches } from "@/lib/stats/match-filters";
import type {
  NormalizedAccount,
  NormalizedMatch,
  NormalizedMMR,
  NormalizedMmrHistoryEntry,
} from "@/types/domain";

interface PlayerTrackerBoardProps {
  account: NormalizedAccount;
  mmr: NormalizedMMR | null;
  matches: NormalizedMatch[];
  history: NormalizedMmrHistoryEntry[];
  region: string;
  onTeam: boolean;
}

interface AgentRow {
  agent: string;
  icon: string | null;
  games: number;
  winRate: number;
  acs: number;
}

interface RecentMatchRow extends NormalizedMatch {
  agentIcon: string | null;
  isMvp: boolean;
}

interface WeaponRow {
  name: string;
  icon: string | null;
  kills: number;
  share: number;
}

interface Achievement {
  title: string;
  detail: string;
  tone: "gold" | "green" | "blue";
}

interface RawWeaponAssets {
  display_icon?: string | null;
  killfeed_icon?: string | null;
}

interface RawWeaponRef {
  name?: string | null;
  assets?: RawWeaponAssets | null;
}

interface RawRoundPlayer {
  player_puuid?: string | null;
  player_display_name?: string | null;
  economy?: {
    weapon?: RawWeaponRef | null;
  } | null;
}

interface RawKillEvent {
  killer_puuid?: string | null;
  killer_display_name?: string | null;
  damage_weapon_name?: string | null;
  damage_weapon_assets?: RawWeaponAssets | null;
}

interface RawAgentAssets {
  small?: string | null;
  killfeed?: string | null;
  display_icon?: string | null;
}

interface RawPlayer {
  puuid?: string | null;
  name?: string | null;
  tag?: string | null;
  stats?: {
    score?: number | null;
  } | null;
  assets?: {
    agent?: RawAgentAssets | null;
  } | null;
}

interface RawRound {
  kills?: RawKillEvent[] | null;
  player_stats?: RawRoundPlayer[] | null;
}

interface MatchRaw {
  players?: {
    all_players?: RawPlayer[] | null;
    red?: RawPlayer[] | null;
    blue?: RawPlayer[] | null;
  } | null;
  rounds?: RawRound[] | null;
}

export function PlayerTrackerBoard({
  account,
  mmr,
  matches,
  history,
  region,
  onTeam,
}: PlayerTrackerBoardProps) {
  const coreMatches = filterCoreStatsMatches(matches);
  const recentWindow = coreMatches.slice(0, 20);

  const wins = coreMatches.filter((match) => match.result === "win").length;
  const losses = coreMatches.filter((match) => match.result === "loss").length;
  const decided = wins + losses;

  const overview = {
    matchesPlayed: coreMatches.length,
    wins,
    winRate: decided > 0 ? (wins / decided) * 100 : null,
    kd: average(
      coreMatches.map((match) =>
        match.deaths === 0 ? match.kills : match.kills / Math.max(1, match.deaths),
      ),
      2,
    ),
    adr: average(coreMatches.map((match) => match.adr), 1),
    acs: average(coreMatches.map((match) => match.acs), 1),
    headshot: average(coreMatches.map((match) => match.headshotPct), 1),
    kills: coreMatches.reduce((sum, match) => sum + match.kills, 0),
  };

  const recentSummary = {
    wins: recentWindow.filter((match) => match.result === "win").length,
    losses: recentWindow.filter((match) => match.result === "loss").length,
    kd: average(
      recentWindow.map((match) =>
        match.deaths === 0 ? match.kills : match.kills / Math.max(1, match.deaths),
      ),
      2,
    ),
    adr: average(recentWindow.map((match) => match.adr), 1),
    acs: average(recentWindow.map((match) => match.acs), 1),
    hs: average(recentWindow.map((match) => match.headshotPct), 1),
  };

  const performanceData = recentWindow
    .slice()
    .reverse()
    .map((match, index) => ({
      label: `${index + 1}`,
      acs: match.acs,
      kd:
        match.deaths === 0
          ? match.kills
          : Number((match.kills / Math.max(1, match.deaths)).toFixed(2)),
      adr: match.adr,
      hs: match.headshotPct,
      result: match.result ?? "draw",
    }));

  const agentRows = buildAgentRows(coreMatches, account);
  const mapRows = buildMapRows(coreMatches);
  const recentMatches = matches.slice(0, 5).map((match) => enrichRecentMatch(match, account));
  const weaponRows = buildWeaponRows(coreMatches, account);
  const topWeapon = weaponRows[0] ?? null;
  const climbData = buildClimbData(history, mmr);
  const recentDelta = history[0]?.rrChange ?? null;
  const achievements = buildAchievements({
    recentMatches,
    recentSummary,
    overview,
    topWeapon,
  });
  const insights = buildInsights({
    agentRows,
    mapRows,
    recentSummary,
    overview,
    topWeapon,
  });
  const progress = mmr?.currentRR != null ? Math.max(0, Math.min(100, mmr.currentRR)) : null;

  return (
    <main className="flex max-w-[1500px] flex-col gap-4">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <span className="eyebrow">stats tracker</span>
            <span className="accent-dot" />
            <Link href="/stats" className="text-sm text-white/54 transition hover:text-white">
              <span className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to search
              </span>
            </Link>
          </div>
          <h1 className="font-display text-[clamp(2rem,3.4vw,3.7rem)] leading-[0.92] tracking-[0.02em] text-white">
            {account.name}
            <span className="ml-3 text-white/34">#{account.tag}</span>
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/46">
            <span>{region.toUpperCase()}</span>
            <span>{onTeam ? "On roster" : "External profile"}</span>
            <span>Updated {relativeTime(account.updatedAt)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <CompactPill label="Current rank" value={mmr?.currentTier ?? "Unranked"} />
          <CompactPill
            label="Rank rating"
            value={mmr?.currentRR != null ? `${mmr.currentRR} RR` : "No RR"}
          />
          <Link
            href={`/insights/${encodeURIComponent(account.name)}/${encodeURIComponent(account.tag)}?region=${region}`}
            className="tracker-action-button tracker-action-button--accent min-w-44"
          >
            <Sparkles className="h-4 w-4" />
            Open AI insights
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <TrackerPanel className="xl:col-span-5" contentClassName="flex h-full flex-col gap-5">
          <PanelHeader title="Current rank" />
          <div className="grid gap-5 md:grid-cols-[200px_1fr]">
            <div className="rounded-[1.15rem] border border-white/7 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-5">
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-[1.2rem] border border-[color:var(--accent-soft)] bg-[color:var(--accent-dim)] p-4 shadow-[0_0_24px_-12px_var(--accent)]">
                  <RankBadge
                    rank={mmr?.currentTier}
                    rr={mmr?.currentRR ?? undefined}
                    className="flex-col gap-3 text-center"
                  />
                </div>
                <div className="font-display text-[1.85rem] uppercase tracking-[0.05em]">
                  {mmr?.currentTier ?? "Unranked"}
                </div>
                <div className="mt-1 text-sm tracking-[0.18em] text-white/52">
                  {mmr?.currentRR != null ? `${mmr.currentRR} RR` : "Placement pending"}
                </div>
                <div className="mt-4 text-xs uppercase tracking-[0.2em] text-white/32">
                  Peak: {mmr?.peakTier ?? "—"}
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-[0.68rem] uppercase tracking-[0.22em] text-white/40">
                  <span>Rank rating</span>
                  <span>{mmr?.currentRR != null ? `${mmr.currentRR} / 100 RR` : "Pending"}</span>
                </div>
                <div className="h-2 rounded-full bg-white/6">
                  <div
                    className="h-2 rounded-full bg-[linear-gradient(90deg,#e3ae40_0%,#f6c453_100%)] shadow-[0_0_18px_-6px_rgba(246,196,83,0.85)]"
                    style={{ width: `${progress ?? 6}%` }}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MiniMetric label="Win %" value={formatPercent(overview.winRate, 1)} />
                <MiniMetric label="K/D" value={fmtNumber(overview.kd, 2)} />
                <MiniMetric label="HS%" value={formatPercent(overview.headshot, 1)} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <SignalBox
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="RR change"
                  value={
                    recentDelta != null
                      ? `${recentDelta > 0 ? "+" : ""}${recentDelta}`
                      : "No recent delta"
                  }
                />
                <SignalBox
                  icon={<Hash className="h-4 w-4" />}
                  label="Leaderboard"
                  value={
                    mmr?.leaderboardPlace != null
                      ? `#${mmr.leaderboardPlace.toLocaleString()}`
                      : "—"
                  }
                />
              </div>
            </div>
          </div>
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-4" contentClassName="flex h-full flex-col gap-4">
          <PanelHeader
            title="Recent performance"
            action={
              <div className="font-display text-lg tracking-[0.06em] text-white">
                <span className="text-emerald-400">{recentSummary.wins}W</span>
                <span className="mx-2 text-white/22">·</span>
                <span className="text-rose-400">{recentSummary.losses}L</span>
              </div>
            }
          />
          {performanceData.length > 0 ? (
            <>
              <div className="h-[170px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="player-acs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(246,196,83,0.42)" />
                        <stop offset="100%" stopColor="rgba(246,196,83,0)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      stroke="rgba(255,255,255,0.28)"
                      fontSize={11}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      stroke="rgba(255,255,255,0.28)"
                      fontSize={11}
                      width={30}
                    />
                    <Tooltip
                      cursor={{ stroke: "rgba(255,255,255,0.08)" }}
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: "rgba(255,255,255,0.56)" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="acs"
                      stroke="#f6c453"
                      strokeWidth={2.4}
                      fill="url(#player-acs)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap gap-2">
                {performanceData.map((point, index) => (
                  <span
                    key={`${point.label}-${index}`}
                    className={cn(
                      "grid h-5 w-5 place-items-center rounded-[0.3rem] text-[10px] font-semibold text-black/90",
                      point.result === "win" && "bg-emerald-400",
                      point.result === "loss" && "bg-rose-400",
                      point.result === "draw" && "bg-white/35 text-white",
                    )}
                  >
                    {index + 1}
                  </span>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <DataMetric label="K/D" value={fmtNumber(recentSummary.kd, 2)} />
                <DataMetric label="ADR" value={fmtNumber(recentSummary.adr, 1)} />
                <DataMetric label="ACS" value={fmtNumber(recentSummary.acs, 1)} />
                <DataMetric label="HS%" value={formatPercent(recentSummary.hs, 1)} />
              </div>
            </>
          ) : (
            <EmptyText>Track a few core matches to light up the performance view.</EmptyText>
          )}
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-3" contentClassName="flex h-full flex-col gap-3">
          <PanelHeader title="Most played agents" />
          {agentRows.length > 0 ? (
            agentRows.map((row) => (
              <div
                key={row.agent}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[1rem] border border-white/6 bg-white/[0.025] px-3 py-3"
              >
                <AgentThumb icon={row.icon} label={row.agent} />
                <div className="min-w-0">
                  <div className="truncate font-display text-lg tracking-[0.04em]">{row.agent}</div>
                  <div className="text-xs text-white/38">{row.games} matches</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-lg">{formatPercent(row.winRate, 0)}</div>
                  <div className="text-xs uppercase tracking-[0.18em] text-white/32">
                    {fmtInt(row.acs)} ACS
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyText>No core agent data yet.</EmptyText>
          )}
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-12 p-0">
          <div className="grid divide-y divide-white/6 sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-7 xl:divide-x">
            <OverviewCell label="Matches played" value={fmtInt(overview.matchesPlayed)} />
            <OverviewCell label="Wins" value={fmtInt(overview.wins)} />
            <OverviewCell label="Win %" value={formatPercent(overview.winRate, 1)} />
            <OverviewCell label="K/D" value={fmtNumber(overview.kd, 2)} />
            <OverviewCell label="ADR" value={fmtNumber(overview.adr, 1)} />
            <OverviewCell label="ACS" value={fmtNumber(overview.acs, 1)} />
            <OverviewCell label="Headshot %" value={formatPercent(overview.headshot, 1)} />
          </div>
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-5" contentClassName="flex h-full flex-col gap-3">
          <PanelHeader title="Recent matches" />
          {recentMatches.length > 0 ? (
            recentMatches.map((match) => (
              <div
                key={match.matchId}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[1rem] border border-white/6 bg-white/[0.02] px-3 py-3"
              >
                <AgentThumb icon={match.agentIcon} label={match.agent ?? "Unknown"} large />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-display text-base tracking-[0.04em]">
                      {match.agent ?? "Unknown"}
                    </span>
                    {match.isMvp ? (
                      <span className="rounded-[0.45rem] bg-emerald-500/18 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                        MVP
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/32">
                    {match.map} · {match.mode}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <ScoreStat label="KDA" value={`${match.kills}/${match.deaths}/${match.assists}`} />
                    <ScoreStat label="ACS" value={`${match.acs}`} />
                    <ScoreStat label="Score" value={`${match.scoreTeam}-${match.scoreOpponent}`} />
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={cn(
                      "font-display text-sm uppercase tracking-[0.16em]",
                      match.result === "win" && "text-emerald-400",
                      match.result === "loss" && "text-rose-400",
                      match.result === "draw" && "text-white/48",
                    )}
                  >
                    {match.result ?? "draw"}
                  </div>
                  <div className="mt-1 text-xs text-white/34">{shortDate(match.startedAt)}</div>
                </div>
              </div>
            ))
          ) : (
            <EmptyText>No matches returned yet.</EmptyText>
          )}
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-4" contentClassName="flex h-full flex-col gap-3">
          <PanelHeader title="Map performance" />
          {mapRows.length > 0 ? (
            mapRows.map((row) => (
              <div
                key={row.map}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[1rem] border border-white/6 bg-white/[0.02] px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="font-display text-lg tracking-[0.04em]">{row.map}</div>
                  <div className="text-xs uppercase tracking-[0.18em] text-white/32">
                    {row.games} matches
                  </div>
                </div>
                <MapCell label="Win %" value={formatPercent(row.winRate, 0)} />
                <MapCell label="K/D" value={fmtNumber(row.kd, 2)} />
              </div>
            ))
          ) : (
            <EmptyText>Map splits appear once tracked matches build up.</EmptyText>
          )}
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-3" contentClassName="flex h-full flex-col gap-4">
          <PanelHeader title="Weapon stats" />
          {weaponRows.length > 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-[132px_1fr] sm:items-center">
                <div className="relative h-[132px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={weaponRows.slice(0, 5).map((row, index) => ({
                          ...row,
                          color: weaponPalette[index] ?? weaponPalette[weaponPalette.length - 1],
                        }))}
                        dataKey="share"
                        nameKey="name"
                        innerRadius={34}
                        outerRadius={52}
                        paddingAngle={2}
                      >
                        {weaponRows.slice(0, 5).map((row, index) => (
                          <Cell
                            key={row.name}
                            fill={weaponPalette[index] ?? weaponPalette[weaponPalette.length - 1]}
                          />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(value) => `${Number(value).toFixed(1)}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  {topWeapon?.icon ? (
                    <div className="relative h-10 w-28 overflow-hidden rounded-[0.8rem] border border-white/6 bg-black/24 p-2">
                      <Image
                        src={topWeapon.icon}
                        alt={topWeapon.name}
                        fill
                        sizes="112px"
                        className="object-contain object-left p-2"
                      />
                    </div>
                  ) : null}
                  {weaponRows.slice(0, 5).map((row, index) => (
                    <div key={row.name} className="flex items-center justify-between gap-3 text-sm text-white/68">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              weaponPalette[index] ?? weaponPalette[weaponPalette.length - 1],
                          }}
                        />
                        <span>{row.name}</span>
                      </div>
                      <span>{formatPercent(row.share, 1)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <DataMetric label="HS%" value={formatPercent(overview.headshot, 1)} compact />
                <DataMetric label="K/D" value={fmtNumber(overview.kd, 2)} compact />
                <DataMetric label="Kills" value={fmtInt(overview.kills)} compact />
              </div>
            </>
          ) : (
            <EmptyText>Weapon mix appears once kill events exist in the tracked sample.</EmptyText>
          )}
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-4" contentClassName="flex h-full flex-col gap-4">
          <PanelHeader
            title="Rank climb"
            action={
              <div className="text-right">
                <div className="font-display text-lg tracking-[0.05em]">
                  {mmr?.currentTier ?? "Unranked"}
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-white/34">
                  {mmr?.currentRR != null ? `${mmr.currentRR} RR now` : "No live RR"}
                </div>
              </div>
            }
          />
          {climbData.length > 0 ? (
            <>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={climbData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      stroke="rgba(255,255,255,0.28)"
                      fontSize={11}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      stroke="rgba(255,255,255,0.28)"
                      fontSize={11}
                      width={42}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#f6c453"
                      strokeWidth={2.6}
                      dot={{ r: 2.4, fill: "#f6c453" }}
                      activeDot={{ r: 4.5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {history.slice(0, 4).map((entry, index) => (
                  <div
                    key={`${entry.date}-${index}`}
                    className="rounded-[0.95rem] border border-white/6 bg-black/18 px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-white/72">{entry.map ?? "Competitive"}</div>
                      <div
                        className={cn(
                          "font-display text-lg",
                          entry.rrChange > 0 && "text-emerald-400",
                          entry.rrChange < 0 && "text-rose-400",
                          entry.rrChange === 0 && "text-white/48",
                        )}
                      >
                        {entry.rrChange > 0 ? "+" : ""}
                        {entry.rrChange}
                      </div>
                    </div>
                    <div className="mt-2 text-xs uppercase tracking-[0.18em] text-white/32">
                      {shortDate(entry.date)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyText>Henrik did not return recent RR history for this account.</EmptyText>
          )}
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-4" contentClassName="flex h-full flex-col gap-4">
          <PanelHeader title="Recent achievements" />
          <div className="grid gap-3">
            {achievements.map((achievement) => (
              <div
                key={achievement.title}
                className={cn(
                  "rounded-[1rem] border px-4 py-4",
                  achievement.tone === "gold" &&
                    "border-amber-400/18 bg-amber-400/8 shadow-[0_0_28px_-20px_rgba(246,196,83,0.8)]",
                  achievement.tone === "green" &&
                    "border-emerald-400/18 bg-emerald-400/8 shadow-[0_0_28px_-20px_rgba(52,211,153,0.6)]",
                  achievement.tone === "blue" &&
                    "border-sky-400/18 bg-sky-400/8 shadow-[0_0_28px_-20px_rgba(56,189,248,0.6)]",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 rounded-[0.7rem] p-2",
                      achievement.tone === "gold" && "bg-amber-400/12 text-amber-200",
                      achievement.tone === "green" && "bg-emerald-400/12 text-emerald-200",
                      achievement.tone === "blue" && "bg-sky-400/12 text-sky-200",
                    )}
                  >
                    {achievement.tone === "gold" ? (
                      <Award className="h-4 w-4" />
                    ) : achievement.tone === "green" ? (
                      <Flame className="h-4 w-4" />
                    ) : (
                      <Target className="h-4 w-4" />
                    )}
                  </span>
                  <div>
                    <div className="font-display text-lg tracking-[0.04em]">
                      {achievement.title}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-white/48">
                      {achievement.detail}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-4" contentClassName="flex h-full flex-col gap-4">
          <PanelHeader title="AI insights" />
          <div className="rounded-[1.05rem] border border-[color:var(--accent-soft)] bg-[color:var(--accent-dim)] p-4 shadow-[0_0_24px_-16px_var(--accent)]">
            <div className="flex items-start gap-3">
              <span className="rounded-[0.7rem] bg-black/24 p-2 text-[color:var(--accent)]">
                <BrainCircuit className="h-4 w-4" />
              </span>
              <div>
                <div className="font-display text-lg tracking-[0.04em]">Generated read</div>
                <div className="mt-1 text-sm leading-6 text-white/54">
                  A compact preview based on the current tracked sample. Open the full AI page for the deeper analysis.
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {insights.map((insight) => (
              <div
                key={insight.label}
                className="rounded-[1rem] border border-white/6 bg-white/[0.025] px-4 py-4"
              >
                <div className="text-[0.62rem] uppercase tracking-[0.18em] text-white/32">
                  {insight.label}
                </div>
                <div className="mt-2 text-sm leading-6 text-white/72">{insight.body}</div>
              </div>
            ))}
          </div>

          <Link
            href={`/insights/${encodeURIComponent(account.name)}/${encodeURIComponent(account.tag)}?region=${region}`}
            className="tracker-action-button tracker-action-button--accent mt-auto"
          >
            Open full AI analysis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </TrackerPanel>
      </section>
    </main>
  );
}

function buildAgentRows(matches: NormalizedMatch[], account: NormalizedAccount): AgentRow[] {
  const grouped = new Map<
    string,
    { icon: string | null; wins: number; decided: number; acs: number[]; games: number }
  >();

  for (const match of matches) {
    const key = match.agent ?? "Unknown";
    const rawPlayer = findRawPlayer(match.raw, account);
    const bucket = grouped.get(key) ?? {
      icon: extractAgentIcon(rawPlayer),
      wins: 0,
      decided: 0,
      acs: [] as number[],
      games: 0,
    };

    bucket.games += 1;
    bucket.acs.push(match.acs);
    if (!bucket.icon) bucket.icon = extractAgentIcon(rawPlayer);
    if (match.result === "win") {
      bucket.wins += 1;
      bucket.decided += 1;
    } else if (match.result === "loss") {
      bucket.decided += 1;
    }
    grouped.set(key, bucket);
  }

  return [...grouped.entries()]
    .map(([agent, bucket]) => ({
      agent,
      icon: bucket.icon,
      games: bucket.games,
      winRate: bucket.decided > 0 ? (bucket.wins / bucket.decided) * 100 : 0,
      acs: average(bucket.acs, 0) ?? 0,
    }))
    .sort((left, right) => right.games - left.games || right.acs - left.acs)
    .slice(0, 3);
}

function buildMapRows(matches: NormalizedMatch[]) {
  const grouped = new Map<
    string,
    { wins: number; decided: number; kd: number[]; games: number }
  >();

  for (const match of matches) {
    const bucket = grouped.get(match.map) ?? {
      wins: 0,
      decided: 0,
      kd: [] as number[],
      games: 0,
    };
    bucket.games += 1;
    bucket.kd.push(
      match.deaths === 0 ? match.kills : match.kills / Math.max(1, match.deaths),
    );
    if (match.result === "win") {
      bucket.wins += 1;
      bucket.decided += 1;
    } else if (match.result === "loss") {
      bucket.decided += 1;
    }
    grouped.set(match.map, bucket);
  }

  return [...grouped.entries()]
    .map(([map, bucket]) => ({
      map,
      games: bucket.games,
      winRate: bucket.decided > 0 ? (bucket.wins / bucket.decided) * 100 : 0,
      kd: average(bucket.kd, 2),
    }))
    .sort((left, right) => right.games - left.games || (right.kd ?? 0) - (left.kd ?? 0))
    .slice(0, 5);
}

function enrichRecentMatch(match: NormalizedMatch, account: NormalizedAccount): RecentMatchRow {
  const players = getRawPlayers(match.raw);
  const rawPlayer = findRawPlayer(match.raw, account);
  const score = typeof rawPlayer?.stats?.score === "number" ? rawPlayer.stats.score : null;
  const maxScore = players.reduce((max, player) => {
    const playerScore = typeof player?.stats?.score === "number" ? player.stats.score : 0;
    return Math.max(max, playerScore);
  }, 0);

  return {
    ...match,
    agentIcon: extractAgentIcon(rawPlayer),
    isMvp: score != null && maxScore > 0 && score === maxScore,
  };
}

function buildWeaponRows(matches: NormalizedMatch[], account: NormalizedAccount): WeaponRow[] {
  const grouped = new Map<
    string,
    { icon: string | null; kills: number; rounds: number }
  >();

  for (const match of matches) {
    const raw = asMatchRaw(match.raw);
    const rounds = Array.isArray(raw.rounds) ? raw.rounds : [];

    for (const round of rounds) {
      const kills = Array.isArray(round?.kills) ? round.kills : [];
      for (const kill of kills) {
        if (!isCurrentPlayerKill(kill, account)) continue;
        const name = kill?.damage_weapon_name ?? "Unknown";
        const bucket = grouped.get(name) ?? {
          icon:
            kill?.damage_weapon_assets?.display_icon ??
            kill?.damage_weapon_assets?.killfeed_icon ??
            null,
          kills: 0,
          rounds: 0,
        };
        bucket.kills += 1;
        if (!bucket.icon) {
          bucket.icon =
            kill?.damage_weapon_assets?.display_icon ??
            kill?.damage_weapon_assets?.killfeed_icon ??
            null;
        }
        grouped.set(name, bucket);
      }

      const roundPlayer = findRoundPlayer(round, account);
      const weaponName = roundPlayer?.economy?.weapon?.name ?? null;
      if (weaponName) {
        const bucket = grouped.get(weaponName) ?? {
          icon:
            roundPlayer?.economy?.weapon?.assets?.display_icon ??
            roundPlayer?.economy?.weapon?.assets?.killfeed_icon ??
            null,
          kills: 0,
          rounds: 0,
        };
        bucket.rounds += 1;
        if (!bucket.icon) {
          bucket.icon =
            roundPlayer?.economy?.weapon?.assets?.display_icon ??
            roundPlayer?.economy?.weapon?.assets?.killfeed_icon ??
            null;
        }
        grouped.set(weaponName, bucket);
      }
    }
  }

  const totalKills = [...grouped.values()].reduce((sum, bucket) => sum + bucket.kills, 0);
  const totalRounds = [...grouped.values()].reduce((sum, bucket) => sum + bucket.rounds, 0);

  return [...grouped.entries()]
    .map(([name, bucket]) => ({
      name,
      icon: bucket.icon,
      kills: bucket.kills,
      share:
        totalKills > 0
          ? (bucket.kills / totalKills) * 100
          : totalRounds > 0
            ? (bucket.rounds / totalRounds) * 100
            : 0,
    }))
    .sort((left, right) => right.share - left.share || right.kills - left.kills)
    .slice(0, 5);
}

function buildClimbData(history: NormalizedMmrHistoryEntry[], mmr: NormalizedMMR | null) {
  const ordered = [...history].sort(
    (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime(),
  );
  if (ordered.length === 0) return [];

  const totalDelta = ordered.reduce((sum, entry) => sum + entry.rrChange, 0);
  let fallbackValue =
    mmr?.currentRR != null ? Math.max(mmr.currentRR - totalDelta, 0) : 0;

  return ordered.map((entry) => {
    fallbackValue += entry.rrChange;
    return {
      label: shortDate(entry.date),
      value: entry.elo ?? fallbackValue,
      rr: entry.rrChange,
    };
  });
}

function buildAchievements({
  recentMatches,
  recentSummary,
  overview,
  topWeapon,
}: {
  recentMatches: RecentMatchRow[];
  recentSummary: {
    wins: number;
    losses: number;
    kd: number | null;
    adr: number | null;
    acs: number | null;
    hs: number | null;
  };
  overview: {
    matchesPlayed: number;
    wins: number;
    winRate: number | null;
    kd: number | null;
    adr: number | null;
    acs: number | null;
    headshot: number | null;
    kills: number;
  };
  topWeapon: WeaponRow | null;
}): Achievement[] {
  const mvpCount = recentMatches.filter((match) => match.isMvp).length;
  const items: Achievement[] = [];

  items.push(
    mvpCount > 0
      ? {
          title: "MVP pace",
          detail: `${mvpCount} MVP ${mvpCount === 1 ? "finish" : "finishes"} in the last ${recentMatches.length} tracked matches.`,
          tone: "gold",
        }
      : {
          title: "Clean sample",
          detail: `${fmtInt(recentMatches.length)} recent tracked matches are ready for review and AI analysis.`,
          tone: "gold",
        },
  );

  items.push(
    overview.headshot != null && overview.headshot >= 20
      ? {
          title: "Sharp shooter",
          detail: `${formatPercent(overview.headshot, 1)} headshot rate keeps the crosshair work above the normal ladder average.`,
          tone: "blue",
        }
      : {
          title: "Headshot focus",
          detail: "Crosshair placement is still the cleanest path to more consistent carry rounds.",
          tone: "blue",
        },
  );

  items.push(
    topWeapon?.name === "Operator" && topWeapon.share >= 18
      ? {
          title: "Operator online",
          detail: `The Operator owns ${formatPercent(topWeapon.share, 1)} of the current weapon mix.`,
          tone: "green",
        }
      : recentSummary.acs != null && recentSummary.acs >= 230
        ? {
            title: "High impact",
            detail: `Recent ACS is sitting at ${fmtNumber(recentSummary.acs, 1)}, which is strong enough to anchor the climb.`,
            tone: "green",
          }
        : {
            title: "Stable volume",
            detail: `${fmtInt(overview.kills)} kills are already in the tracked sample, so trend reads are no longer thin.`,
            tone: "green",
          },
  );

  return items;
}

function buildInsights({
  agentRows,
  mapRows,
  recentSummary,
  overview,
  topWeapon,
}: {
  agentRows: AgentRow[];
  mapRows: Array<{ map: string; games: number; winRate: number; kd: number | null }>;
  recentSummary: {
    wins: number;
    losses: number;
    kd: number | null;
    adr: number | null;
    acs: number | null;
    hs: number | null;
  };
  overview: {
    matchesPlayed: number;
    wins: number;
    winRate: number | null;
    kd: number | null;
    adr: number | null;
    acs: number | null;
    headshot: number | null;
    kills: number;
  };
  topWeapon: WeaponRow | null;
}) {
  const bestAgent = agentRows[0];
  const bestMap = mapRows[0];

  return [
    {
      label: "Best lane",
      body: bestAgent
        ? `${bestAgent.agent} is the cleanest current pick with ${formatPercent(bestAgent.winRate, 0)} win rate across ${bestAgent.games} tracked matches.`
        : "Track a few more core matches to lock in the strongest agent lane.",
    },
    {
      label: "Map read",
      body: bestMap
        ? `${bestMap.map} is currently the best board with ${formatPercent(bestMap.winRate, 0)} win rate and ${fmtNumber(bestMap.kd, 2)} K/D.`
        : "Map reads will stabilize once the tracked sample covers more than one or two boards.",
    },
    {
      label: "Focus next",
      body:
        overview.headshot != null && overview.headshot < 18
          ? "Headshot rate is still trailing. Tightening first-bullet discipline should lift both ACS and clutch rate."
          : recentSummary.adr != null && recentSummary.adr < 140
            ? "Damage output is lagging the rest of the profile. Fight for cleaner first contact instead of longer trade rounds."
            : topWeapon?.name === "Operator"
              ? "The Operator is a real part of the current sample. Lean into it when the economy allows and the map supports long first contact."
              : "Momentum is healthy. Keep leaning into the strongest agent lane and protect the recent ACS trend.",
    },
  ];
}

function asMatchRaw(raw: unknown): MatchRaw {
  if (typeof raw === "object" && raw !== null) {
    return raw as MatchRaw;
  }
  return {};
}

function getRawPlayers(raw: unknown): RawPlayer[] {
  const source = asMatchRaw(raw);
  if (Array.isArray(source.players?.all_players)) return source.players.all_players;
  const red = Array.isArray(source.players?.red) ? source.players.red : [];
  const blue = Array.isArray(source.players?.blue) ? source.players.blue : [];
  return [...red, ...blue];
}

function findRawPlayer(raw: unknown, account: NormalizedAccount) {
  return getRawPlayers(raw).find((player) => isCurrentPlayer(player, account)) ?? null;
}

function isCurrentPlayer(player: RawPlayer | null | undefined, account: NormalizedAccount) {
  if (account.puuid && player?.puuid === account.puuid) return true;
  return (
    typeof player?.name === "string" &&
    typeof player?.tag === "string" &&
    player.name.toLowerCase() === account.name.toLowerCase() &&
    player.tag.toLowerCase() === account.tag.toLowerCase()
  );
}

function isCurrentPlayerKill(
  kill: RawKillEvent | null | undefined,
  account: NormalizedAccount,
) {
  if (account.puuid && kill?.killer_puuid === account.puuid) return true;
  const displayName = `${account.name}#${account.tag}`.toLowerCase();
  return typeof kill?.killer_display_name === "string"
    ? kill.killer_display_name.toLowerCase() === displayName
    : false;
}

function findRoundPlayer(round: RawRound | null | undefined, account: NormalizedAccount) {
  const rows = Array.isArray(round?.player_stats) ? round.player_stats : [];
  const displayName = `${account.name}#${account.tag}`.toLowerCase();
  return (
    rows.find((row) => {
      if (account.puuid && row?.player_puuid === account.puuid) return true;
      return typeof row?.player_display_name === "string"
        ? row.player_display_name.toLowerCase() === displayName
        : false;
    }) ?? null
  );
}

function extractAgentIcon(player: RawPlayer | null | undefined) {
  return (
    player?.assets?.agent?.small ??
    player?.assets?.agent?.killfeed ??
    player?.assets?.agent?.display_icon ??
    null
  );
}

function TrackerPanel({
  className,
  contentClassName,
  children,
}: {
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[1.15rem] border border-white/7 bg-[linear-gradient(180deg,rgba(19,22,29,0.98)_0%,rgba(11,13,19,0.99)_100%)] p-4 shadow-[0_24px_60px_-42px_rgba(0,0,0,0.95)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.025),transparent_42%,rgba(255,255,255,0.012)_100%)]" />
      <div className={cn("relative", contentClassName)}>{children}</div>
    </section>
  );
}

function PanelHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/40">
        {title}
      </div>
      {action}
    </div>
  );
}

function CompactPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.95rem] border border-white/7 bg-black/18 px-4 py-3">
      <div className="text-[0.58rem] uppercase tracking-[0.18em] text-white/30">{label}</div>
      <div className="mt-2 text-sm font-medium text-white/82">{value}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.9rem] border border-white/6 bg-white/[0.02] px-3 py-3">
      <div className="text-[0.6rem] uppercase tracking-[0.18em] text-white/32">{label}</div>
      <div className="mt-1 font-display text-[1.55rem] leading-none">{value}</div>
    </div>
  );
}

function DataMetric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[0.9rem] border border-white/6 bg-black/18 px-3 py-3",
        compact && "px-3 py-2",
      )}
    >
      <div className="text-[0.58rem] uppercase tracking-[0.16em] text-white/30">{label}</div>
      <div className={cn("mt-1 font-display tracking-[0.04em]", compact ? "text-xl" : "text-[1.55rem]")}>
        {value}
      </div>
    </div>
  );
}

function SignalBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[0.95rem] border border-white/6 bg-black/18 px-4 py-3">
      <div className="flex items-center gap-2 text-[0.58rem] uppercase tracking-[0.18em] text-white/30">
        <span className="text-[color:var(--accent)]">{icon}</span>
        {label}
      </div>
      <div className="mt-2 font-display text-lg tracking-[0.04em]">{value}</div>
    </div>
  );
}

function OverviewCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-5">
      <div className="text-[0.6rem] uppercase tracking-[0.18em] text-white/30">{label}</div>
      <div className="mt-2 font-display text-[1.8rem] leading-none tracking-[0.03em]">
        {value}
      </div>
    </div>
  );
}

function ScoreStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.75rem] border border-white/6 bg-black/18 px-2.5 py-2">
      <div className="text-[0.54rem] uppercase tracking-[0.16em] text-white/28">{label}</div>
      <div className="mt-1 font-display text-sm tracking-[0.05em]">{value}</div>
    </div>
  );
}

function MapCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="text-[0.54rem] uppercase tracking-[0.16em] text-white/28">{label}</div>
      <div className="mt-1 font-display text-sm tracking-[0.05em]">{value}</div>
    </div>
  );
}

function AgentThumb({
  icon,
  label,
  large = false,
}: {
  icon: string | null;
  label: string;
  large?: boolean;
}) {
  const size = large ? "h-12 w-12 rounded-[0.95rem]" : "h-10 w-10 rounded-[0.85rem]";
  return (
    <div className={cn("overflow-hidden border border-white/8 bg-white/[0.03]", size)}>
      {icon ? (
        <Image
          src={icon}
          alt={label}
          width={large ? 48 : 40}
          height={large ? 48 : 40}
          sizes={large ? "48px" : "40px"}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-xs font-semibold uppercase tracking-[0.16em] text-white/52">
          {label.slice(0, 2)}
        </div>
      )}
    </div>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-white/42">{children}</div>;
}

function average(values: number[], digits: number): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Number(total.toFixed(digits));
}

function formatPercent(value: number | null, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

function shortDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const tooltipStyle = {
  background: "rgba(9, 11, 17, 0.96)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "0.9rem",
  boxShadow: "0 18px 36px -18px rgba(0,0,0,0.8)",
};

const weaponPalette = ["#f6c453", "#78f0cf", "#74b9ff", "#cba6ff", "#98a2b3"];
