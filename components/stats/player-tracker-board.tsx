"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Clock3,
  Crosshair,
  Globe2,
  Hash,
  Radar,
  Shield,
  Sparkles,
  Swords,
  TrendingUp,
  Trophy,
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
  const draws = coreMatches.filter((match) => match.result === "draw").length;
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
      index: index + 1,
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

  const agentRows = [...groupBy(coreMatches, (match) => match.agent ?? "Unknown").entries()]
    .map(([agent, rows]) => {
      const agentWins = rows.filter((match) => match.result === "win").length;
      const agentLosses = rows.filter((match) => match.result === "loss").length;
      const agentDecided = agentWins + agentLosses;
      return {
        agent,
        games: rows.length,
        winRate: agentDecided > 0 ? (agentWins / agentDecided) * 100 : 0,
        acs: average(rows.map((match) => match.acs), 0) ?? 0,
      };
    })
    .sort((left, right) => right.games - left.games || right.acs - left.acs)
    .slice(0, 4);

  const mapRows = [...groupBy(coreMatches, (match) => match.map).entries()]
    .map(([map, rows]) => {
      const mapWins = rows.filter((match) => match.result === "win").length;
      const mapLosses = rows.filter((match) => match.result === "loss").length;
      const mapDecided = mapWins + mapLosses;
      return {
        map,
        games: rows.length,
        winRate: mapDecided > 0 ? (mapWins / mapDecided) * 100 : 0,
        kd: average(
          rows.map((match) =>
            match.deaths === 0 ? match.kills : match.kills / Math.max(1, match.deaths),
          ),
          2,
        ),
      };
    })
    .sort((left, right) => right.games - left.games || (right.kd ?? 0) - (left.kd ?? 0))
    .slice(0, 5);

  const recentMatches = matches.slice(0, 5);
  const resultMix = [
    { label: "Wins", value: wins, color: "#20c972" },
    { label: "Losses", value: losses, color: "#ff6b6b" },
    { label: "Draws", value: draws, color: "#768399" },
  ].filter((entry) => entry.value > 0);

  const progress = mmr?.currentRR != null ? Math.max(0, Math.min(100, mmr.currentRR)) : null;
  const rankPulse = history.slice(0, 6);

  return (
    <main className="flex max-w-[1480px] flex-col gap-5">
      <section className="relative overflow-hidden rounded-[1.6rem] border border-white/7 bg-[linear-gradient(180deg,rgba(19,22,29,0.96)_0%,rgba(10,12,17,0.99)_100%)] px-6 py-6 shadow-[0_28px_72px_-44px_rgba(0,0,0,0.95)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_left_top,rgba(246,196,83,0.18),transparent_30%),radial-gradient(circle_at_right_top,rgba(61,160,255,0.12),transparent_24%),linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_50%,transparent_100%)]" />
        {account.cardUrl ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-[36%] bg-cover bg-right opacity-20 mix-blend-screen xl:block"
            style={{ backgroundImage: `url(${account.cardUrl})` }}
          />
        ) : null}
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-[42rem]">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="eyebrow text-white/45">Stats Tracker</span>
              <span className="accent-dot" />
              <Link href="/stats" className="text-sm text-white/58 transition hover:text-white">
                <span className="inline-flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to search
                </span>
              </Link>
            </div>
            <h1 className="font-display text-[clamp(2.4rem,4vw,4.4rem)] leading-[0.92] tracking-[0.03em] text-white">
              {account.name}
              <span className="ml-3 text-white/38">#{account.tag}</span>
            </h1>
            <p className="mt-3 max-w-[34rem] text-sm leading-7 text-white/56 sm:text-base">
              Competitive snapshot powered by HenrikDev. Core metrics ignore deathmatch queues, while recent match history still shows the raw feed.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <HeroPill
                icon={<Globe2 className="h-4 w-4" />}
                label="Region"
                value={region.toUpperCase()}
              />
              <HeroPill
                icon={<Shield className="h-4 w-4" />}
                label="Roster"
                value={onTeam ? "On team" : "External"}
              />
              <HeroPill
                icon={<Swords className="h-4 w-4" />}
                label="Account Level"
                value={account.accountLevel != null ? `${account.accountLevel}` : "—"}
              />
              <HeroPill
                icon={<Clock3 className="h-4 w-4" />}
                label="Updated"
                value={relativeTime(account.updatedAt)}
              />
            </div>
          </div>

          <div className="grid gap-3 xl:w-[23rem]">
            <Link
              href={`/insights/${encodeURIComponent(account.name)}/${encodeURIComponent(account.tag)}?region=${region}`}
              className="tracker-action-button tracker-action-button--accent h-12"
            >
              <Sparkles className="h-4 w-4" />
              Open AI insights
            </Link>
            <div className="grid gap-3 sm:grid-cols-2">
              <HeroPill
                icon={<Trophy className="h-4 w-4" />}
                label="Peak Rank"
                value={mmr?.peakTier ?? "Unranked"}
              />
              <HeroPill
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
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <TrackerPanel className="xl:col-span-5" contentClassName="flex h-full flex-col gap-5">
          <PanelHeader title="Current Rank" />
          <div className="grid flex-1 gap-5 md:grid-cols-[200px_1fr]">
            <div className="rounded-[1.2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-5">
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-[1.3rem] border border-[color:var(--accent-soft)] bg-[color:var(--accent-dim)] p-4 shadow-[0_0_26px_-12px_var(--accent)]">
                  <RankBadge
                    rank={mmr?.currentTier}
                    rr={mmr?.currentRR ?? undefined}
                    className="flex-col gap-3 text-center"
                  />
                </div>
                <div className="font-display text-[1.9rem] uppercase tracking-[0.06em]">
                  {mmr?.currentTier ?? "Unranked"}
                </div>
                <div className="mt-1 text-sm tracking-[0.18em] text-white/55">
                  {mmr?.currentRR != null ? `${mmr.currentRR} RR` : "No RR yet"}
                </div>
                <div className="mt-4 text-xs uppercase tracking-[0.24em] text-white/34">
                  Peak: {mmr?.peakTier ?? "—"}
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-[0.72rem] uppercase tracking-[0.24em] text-white/42">
                  <span>Rank rating</span>
                  <span>
                    {mmr?.currentRR != null ? `${mmr.currentRR} / 100 RR` : "Pending"}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/6">
                  <div
                    className="h-2 rounded-full bg-[linear-gradient(90deg,#e4ae40_0%,#f6c453_100%)] shadow-[0_0_18px_-6px_rgba(246,196,83,0.88)]"
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
                <Link
                  href={`/insights/${encodeURIComponent(account.name)}/${encodeURIComponent(account.tag)}?region=${region}`}
                  className="tracker-action-button tracker-action-button--accent"
                >
                  AI insights
                </Link>
                <Link href="/players" className="tracker-action-button">
                  Team roster
                </Link>
              </div>
            </div>
          </div>
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-4" contentClassName="flex h-full flex-col gap-4">
          <PanelHeader
            title="Recent Performance"
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
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="tracker-acs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(246,196,83,0.45)" />
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
                      fill="url(#tracker-acs)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap gap-2">
                {performanceData.map((point) => (
                  <span
                    key={point.index}
                    className={cn(
                      "grid h-5 w-5 place-items-center rounded-[0.3rem] text-[10px] font-semibold text-black/90",
                      point.result === "win" && "bg-emerald-400",
                      point.result === "loss" && "bg-rose-400",
                      point.result === "draw" && "bg-white/35 text-white",
                    )}
                    title={`Game ${point.index}`}
                  >
                    {point.index}
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

        <TrackerPanel className="xl:col-span-3" contentClassName="flex h-full flex-col gap-4">
          <PanelHeader title="Most Played Agents" />
          {agentRows.length > 0 ? (
            <div className="flex h-full flex-col gap-3">
              {agentRows.map((row) => (
                <div
                  key={row.agent}
                  className="rounded-[1rem] border border-white/6 bg-white/[0.025] px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-display text-xl tracking-[0.04em]">{row.agent}</div>
                      <div className="mt-1 text-sm text-white/42">
                        {row.games} matches
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-lg">{formatPercent(row.winRate, 0)}</div>
                      <div className="text-xs uppercase tracking-[0.18em] text-white/34">
                        WR
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/34">
                    <span>ACS</span>
                    <span>{fmtInt(row.acs)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyText>No core agent data yet.</EmptyText>
          )}
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-12 p-0">
          <div className="grid divide-y divide-white/6 sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-6 xl:divide-x">
            <OverviewCell label="Matches Played" value={fmtInt(overview.matchesPlayed)} />
            <OverviewCell label="Wins" value={fmtInt(overview.wins)} />
            <OverviewCell label="Win %" value={formatPercent(overview.winRate, 1)} />
            <OverviewCell label="K/D" value={fmtNumber(overview.kd, 2)} />
            <OverviewCell label="ADR" value={fmtNumber(overview.adr, 1)} />
            <OverviewCell label="ACS" value={fmtNumber(overview.acs, 1)} />
          </div>
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-5" contentClassName="flex h-full flex-col gap-4">
          <PanelHeader
            title="Recent Matches"
            action={
              <span className="text-xs uppercase tracking-[0.18em] text-white/34">
                Raw history
              </span>
            }
          />
          <div className="flex flex-col gap-2">
            {recentMatches.length > 0 ? (
              recentMatches.map((match) => (
                <div
                  key={match.matchId}
                  className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_auto] items-center gap-3 rounded-[1rem] border border-white/6 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="font-display text-lg tracking-[0.04em] text-white">
                      {match.agent ?? "Unknown"}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/34">
                      {match.map} · {match.mode}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <ScoreStat label="KDA" value={`${match.kills}/${match.deaths}/${match.assists}`} />
                    <ScoreStat label="ACS" value={`${match.acs}`} />
                    <ScoreStat label="Score" value={`${match.scoreTeam}-${match.scoreOpponent}`} />
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
                    <div className="mt-1 text-xs text-white/34">
                      {shortDate(match.startedAt)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyText>No matches returned yet.</EmptyText>
            )}
          </div>
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-4" contentClassName="flex h-full flex-col gap-4">
          <PanelHeader title="Map Performance" />
          {mapRows.length > 0 ? (
            <div className="flex flex-col gap-2">
              {mapRows.map((row) => (
                <div
                  key={row.map}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 rounded-[1rem] border border-white/6 bg-white/[0.02] px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="font-display text-lg tracking-[0.04em]">{row.map}</div>
                    <div className="text-xs uppercase tracking-[0.18em] text-white/34">
                      {row.games} matches
                    </div>
                  </div>
                  <MapCell label="WR" value={formatPercent(row.winRate, 0)} />
                  <MapCell label="K/D" value={fmtNumber(row.kd, 2)} />
                  <MapCell label="Mode" value="Core" />
                </div>
              ))}
            </div>
          ) : (
            <EmptyText>Map splits appear once tracked matches build up.</EmptyText>
          )}
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-3" contentClassName="flex h-full flex-col gap-4">
          <PanelHeader title="Rank Pulse" />
          {rankPulse.length > 0 ? (
            <div className="flex flex-col gap-3">
              {rankPulse.map((entry, index) => (
                <div
                  key={`${entry.date}-${index}`}
                  className="rounded-[1rem] border border-white/6 bg-white/[0.02] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">{entry.currentTier ?? "Unranked"}</div>
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
                  <div className="mt-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/34">
                    <span>{entry.map ?? "Unknown map"}</span>
                    <span>{shortDate(entry.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyText>No recent RR history returned by the API.</EmptyText>
          )}
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-4" contentClassName="flex h-full flex-col gap-4">
          <PanelHeader title="Result Mix" />
          {resultMix.length > 0 ? (
            <div className="grid flex-1 gap-5 sm:grid-cols-[180px_1fr]">
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={resultMix}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={48}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {resultMix.map((entry) => (
                        <Cell key={entry.label} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col justify-between gap-3">
                <div className="space-y-3">
                  {resultMix.map((entry) => (
                    <div key={entry.label} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 text-sm text-white/68">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        {entry.label}
                      </div>
                      <div className="font-display text-lg">{entry.value}</div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <DataMetric label="HS%" value={formatPercent(overview.headshot, 1)} compact />
                  <DataMetric label="ADR" value={fmtNumber(overview.adr, 1)} compact />
                  <DataMetric label="ACS" value={fmtNumber(overview.acs, 1)} compact />
                </div>
              </div>
            </div>
          ) : (
            <EmptyText>Result mix builds once core matches are available.</EmptyText>
          )}
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-4" contentClassName="flex h-full flex-col gap-4">
          <PanelHeader title="Quick Actions" />
          <div className="grid gap-3 sm:grid-cols-2">
            <ActionLink
              href={`/insights/${encodeURIComponent(account.name)}/${encodeURIComponent(account.tag)}?region=${region}`}
              label="AI Insights"
              detail="Open the analysis panel"
              accent
            />
            <ActionLink href="/stats" label="Track Another" detail="Search a new Riot ID" />
            <ActionLink href="/matches" label="Match Log" detail="Review logged team matches" />
            <ActionLink href="/players" label="Players" detail="Open the team roster" />
          </div>
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-4" contentClassName="flex h-full flex-col gap-4">
          <PanelHeader title="Account Intel" />
          <div className="relative overflow-hidden rounded-[1.1rem] border border-white/6 bg-black/20 p-4">
            {account.cardUrl ? (
              <div
                aria-hidden
                className="absolute inset-0 bg-cover bg-right opacity-20 mix-blend-screen"
                style={{ backgroundImage: `url(${account.cardUrl})` }}
              />
            ) : null}
            <div className="relative grid gap-3">
              <InfoStat
                icon={<Radar className="h-4 w-4" />}
                label="Current Rank"
                value={mmr?.currentTier ?? "Unranked"}
              />
              <InfoStat
                icon={<Activity className="h-4 w-4" />}
                label="Current RR"
                value={mmr?.currentRR != null ? `${mmr.currentRR}` : "—"}
              />
              <InfoStat
                icon={<TrendingUp className="h-4 w-4" />}
                label="Peak"
                value={mmr?.peakTier ?? "—"}
              />
              <InfoStat
                icon={<Crosshair className="h-4 w-4" />}
                label="Headshot"
                value={formatPercent(overview.headshot, 1)}
              />
            </div>
          </div>
        </TrackerPanel>
      </section>
    </main>
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
        "relative overflow-hidden rounded-[1.35rem] border border-white/7 bg-[linear-gradient(180deg,rgba(19,22,29,0.96)_0%,rgba(11,13,19,0.98)_100%)] p-5 shadow-[0_24px_60px_-42px_rgba(0,0,0,0.95)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.03),transparent_42%,rgba(255,255,255,0.015)_100%)]" />
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
      <div className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-white/42">
        {title}
      </div>
      {action}
    </div>
  );
}

function HeroPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1rem] border border-white/7 bg-black/22 px-4 py-3">
      <div className="flex items-center gap-2 text-[0.64rem] uppercase tracking-[0.22em] text-white/34">
        <span className="text-[color:var(--accent)]">{icon}</span>
        {label}
      </div>
      <div className="mt-2 truncate text-sm font-medium text-white/82">{value}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.9rem] border border-white/6 bg-white/[0.02] px-3 py-3">
      <div className="text-[0.66rem] uppercase tracking-[0.2em] text-white/34">{label}</div>
      <div className="mt-1 font-display text-[1.7rem] leading-none">{value}</div>
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
    <div className={cn("rounded-[0.95rem] border border-white/6 bg-black/18 px-3 py-3", compact && "px-3 py-2")}>
      <div className="text-[0.64rem] uppercase tracking-[0.18em] text-white/32">{label}</div>
      <div className={cn("mt-1 font-display tracking-[0.04em]", compact ? "text-xl" : "text-[1.65rem]")}>
        {value}
      </div>
    </div>
  );
}

function OverviewCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-5">
      <div className="text-[0.66rem] uppercase tracking-[0.2em] text-white/34">{label}</div>
      <div className="mt-2 font-display text-[2rem] leading-none tracking-[0.03em]">
        {value}
      </div>
    </div>
  );
}

function ScoreStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.85rem] border border-white/6 bg-black/20 px-3 py-2">
      <div className="text-[0.58rem] uppercase tracking-[0.16em] text-white/30">{label}</div>
      <div className="mt-1 font-display text-sm tracking-[0.06em]">{value}</div>
    </div>
  );
}

function MapCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="text-[0.58rem] uppercase tracking-[0.16em] text-white/28">{label}</div>
      <div className="mt-1 font-display text-sm tracking-[0.05em]">{value}</div>
    </div>
  );
}

function ActionLink({
  href,
  label,
  detail,
  accent = false,
}: {
  href: string;
  label: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-[1rem] border px-4 py-4 transition",
        accent
          ? "border-[color:var(--accent-soft)] bg-[color:var(--accent-dim)] shadow-[0_0_24px_-14px_var(--accent)] hover:border-[color:var(--accent)]"
          : "border-white/6 bg-white/[0.02] hover:border-white/12",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-display text-lg tracking-[0.04em]">{label}</div>
          <div className="mt-1 text-sm text-white/44">{detail}</div>
        </div>
        <ArrowRight className="h-4 w-4 text-white/42" />
      </div>
    </Link>
  );
}

function InfoStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[0.95rem] border border-white/6 bg-black/18 px-3 py-3">
      <div className="flex items-center gap-2 text-[0.64rem] uppercase tracking-[0.18em] text-white/32">
        <span className="text-[color:var(--accent)]">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-sm font-medium">{value}</div>
    </div>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-white/42">{children}</div>;
}

function groupBy<T>(rows: T[], getKey: (row: T) => string) {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const key = getKey(row);
    const bucket = grouped.get(key) ?? [];
    bucket.push(row);
    grouped.set(key, bucket);
  }
  return grouped;
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
