"use client";

import Image from "next/image";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  BrainCircuit,
  Crosshair,
  Crown,
  Map as MapIcon,
  Shield,
  Sparkles,
  Swords,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { getAgentAsset, getMapAsset } from "@/lib/valorant/assets";
import { getCompetitiveTierAsset, getRankTheme } from "@/lib/valorant/ranks";
import { cn } from "@/lib/utils";
import type {
  NormalizedAccount,
  NormalizedMMR,
  NormalizedMatch,
  NormalizedMmrHistoryEntry,
} from "@/types/domain";

interface Props {
  account: NormalizedAccount;
  mmr: NormalizedMMR | null;
  matches: NormalizedMatch[];
  history: NormalizedMmrHistoryEntry[];
  region: string;
  onTeam?: boolean;
  insightsHref: string;
}

const tooltipStyle = {
  background: "#0a0f18",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  boxShadow: "0 24px 48px -32px rgba(0,0,0,0.9)",
};

const tooltipLabelStyle = { color: "rgba(255,255,255,0.56)" };

export function PlayerStatsDashboard({
  account,
  mmr,
  matches,
  history,
  region,
  onTeam,
  insightsHref,
}: Props) {
  const theme = getRankTheme(mmr?.currentTierId, mmr?.currentTier);
  const rankAsset = getCompetitiveTierAsset(mmr?.currentTierId);
  const summary = summarizeMatches(matches);
  const recentMatches = matches.slice(0, 5);
  const trendData = [...matches].reverse().map((match) => ({
    label: new Date(match.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    acs: match.acs,
  }));
  const rrSeries = history
    .slice(-14)
    .map((entry) => ({
      label: new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      delta: entry.rrChange ?? 0,
    }))
    .reduce<Array<{ label: string; rr: number }>>((acc, entry) => {
      const previous = acc[acc.length - 1]?.rr ?? 0;
      acc.push({ label: entry.label, rr: previous + entry.delta });
      return acc;
    }, []);

  const agents = summarizeAgents(matches);
  const maps = summarizeMaps(matches);
  const outcomes = buildOutcomeBreakdown(matches);
  const insightCards = buildInsightCards({
    hs: summary.hs,
    agents,
    maps,
    history,
  });

  const metricTiles = [
    { label: "Win Rate", value: formatPercent(summary.winRate, 1), sublabel: outcomeRank(summary.winRate, 52, 44), icon: Trophy },
    { label: "K/D", value: summary.kd.toFixed(2), sublabel: outcomeRank(summary.kd, 1.25, 0.95), icon: Crosshair },
    { label: "ACS", value: summary.acs.toFixed(1), sublabel: outcomeRank(summary.acs, 240, 190), icon: Target },
    { label: "ADR", value: summary.adr.toFixed(1), sublabel: outcomeRank(summary.adr, 155, 125), icon: Swords },
    { label: "HS%", value: formatPercent(summary.hs, 1), sublabel: outcomeRank(summary.hs, 22, 15), icon: Crown },
    { label: "Matches", value: String(matches.length), sublabel: "Recent sample", icon: Activity },
  ];

  const currentRR = mmr?.currentRR ?? 0;
  const rrProgress = Math.max(0, Math.min(100, currentRR));

  return (
    <div className="relative isolate">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-72 blur-3xl"
        style={{
          background: `radial-gradient(circle at 20% 30%, ${theme.accentSoft}, transparent 46%), radial-gradient(circle at 80% 10%, rgba(56, 189, 248, 0.12), transparent 35%)`,
        }}
      />

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section
          className="group relative overflow-hidden rounded-[28px] border p-6 shadow-[0_32px_80px_-48px_rgba(0,0,0,0.85)] transition duration-300 hover:-translate-y-1"
          style={{
            background: "linear-gradient(180deg, rgba(11,18,31,0.96) 0%, rgba(6,11,19,0.96) 100%)",
            borderColor: theme.ring,
            boxShadow: `0 0 0 1px ${theme.accentSoft}, 0 32px 80px -48px rgba(0, 0, 0, 0.9)`,
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 opacity-90"
            style={{
              background: `radial-gradient(circle at 16% 20%, ${theme.accentSoft}, transparent 34%), linear-gradient(135deg, rgba(255,255,255,0.03), transparent 42%)`,
            }}
          />
          <div
            aria-hidden
            className="absolute inset-y-0 right-0 w-40 opacity-20"
            style={{
              backgroundImage: account.cardUrl ? `url(${account.cardUrl})` : undefined,
              backgroundPosition: "center right",
              backgroundSize: "cover",
              mixBlendMode: "screen",
            }}
          />

          <div className="relative flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-white/10 bg-white/5 text-white/80">
                  Stats Tracker
                </Badge>
                <Badge variant="outline" className="border-white/10 bg-white/5 text-white/80">
                  {region.toUpperCase()}
                </Badge>
              </div>
              <h1 className="font-display text-5xl leading-none tracking-tight text-white">
                {account.name} <span className="text-white/45">#{account.tag}</span>
              </h1>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: theme.accent, boxShadow: `0 0 16px ${theme.accent}` }} />
                Peak {mmr?.peakTier ?? mmr?.currentTier ?? "Unranked"}
              </div>
            </div>
            {onTeam ? (
              <Badge className="border-transparent bg-white/8 text-white">Roster</Badge>
            ) : (
              <Badge variant="outline" className="border-white/10 bg-white/5 text-white/70">
                External
              </Badge>
            )}
          </div>

          <div className="relative mt-6 flex items-center gap-5">
            <div
              className="relative flex h-40 w-40 items-center justify-center rounded-[26px] border bg-black/20"
              style={{ borderColor: theme.ring, boxShadow: `inset 0 0 32px ${theme.accentSoft}` }}
            >
              <div
                aria-hidden
                className="absolute inset-3 rounded-[20px]"
                style={{ background: `radial-gradient(circle, ${theme.accentSoft}, transparent 65%)` }}
              />
              {rankAsset ? (
                <Image
                  src={rankAsset.largeIcon}
                  alt={mmr?.currentTier ?? "Rank emblem"}
                  width={132}
                  height={132}
                  className="relative drop-shadow-[0_0_28px_rgba(57,246,207,0.25)]"
                />
              ) : (
                <Shield className="relative h-14 w-14 text-white/60" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[0.72rem] uppercase tracking-[0.28em] text-white/45">Current Rank</div>
              <div className="mt-2 font-display text-5xl leading-none tracking-tight" style={{ color: theme.accent }}>
                {mmr?.currentTier ?? "Unranked"}
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <div className="font-display text-4xl leading-none text-white">{currentRR}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/45">Rank Rating</div>
                </div>
                {mmr?.leaderboardPlace ? (
                  <div className="text-right text-sm text-white/70">
                    <div className="font-display text-xl text-white">#{mmr.leaderboardPlace.toLocaleString()}</div>
                    <div className="uppercase tracking-[0.18em] text-white/40">Leaderboard</div>
                  </div>
                ) : null}
              </div>

              <div className="mt-4">
                <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${rrProgress}%`,
                      background: `linear-gradient(90deg, ${theme.accent} 0%, color-mix(in srgb, ${theme.accent} 78%, white) 100%)`,
                      boxShadow: `0 0 24px ${theme.accentSoft}`,
                    }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs uppercase tracking-[0.18em] text-white/40">
                  <span>0 RR</span>
                  <span>{rrProgress}/100 RR</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-3 gap-3 rounded-[22px] border border-white/8 bg-black/20 p-4 text-center">
            <MetaBlock label="Region" value={region.toUpperCase()} />
            <MetaBlock label="Account" value="Public" />
            <MetaBlock label="Level" value={account.accountLevel ? String(account.accountLevel) : "N/A"} />
          </div>

          <Link
            href={insightsHref}
            className="relative mt-6 flex items-center justify-center gap-2 rounded-2xl border px-4 py-4 text-sm font-semibold tracking-[0.12em] uppercase transition duration-300 hover:-translate-y-0.5"
            style={{
              borderColor: theme.ring,
              background: `linear-gradient(180deg, ${theme.accentSoft} 0%, rgba(6, 10, 18, 0.4) 100%)`,
              color: theme.accent,
              boxShadow: `0 0 0 1px ${theme.accentSoft}, inset 0 1px 0 rgba(255,255,255,0.06)`,
            }}
          >
            <Sparkles className="h-4 w-4" />
            Open AI Analysis
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </section>

        <section className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-6">
            {metricTiles.map((tile) => (
              <MetricTile key={tile.label} {...tile} accentSoft={theme.accentSoft} />
            ))}
          </div>

          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)]">
            <ChartPanel
              title="Performance Trend"
              subtitle={`Last ${trendData.length || 0} matches`}
              accent={theme.accentSoft}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="performance-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.accent} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                  <XAxis dataKey="label" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.28)" fontSize={11} tickLine={false} axisLine={false} width={34} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                  <Area type="monotone" dataKey="acs" stroke={theme.accent} strokeWidth={2.25} fill="url(#performance-fill)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel
              title="RR Progression"
              subtitle={rrSeries.length ? "Recent competitive movement" : "No RR history yet"}
              accent={theme.accentSoft}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rrSeries}>
                  <defs>
                    <linearGradient id="rr-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.accent} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                  <XAxis dataKey="label" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.28)" fontSize={11} tickLine={false} axisLine={false} width={42} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                  <Area type="monotone" dataKey="rr" stroke={theme.accent} strokeWidth={2.25} fill="url(#rr-fill)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 2xl:grid-cols-[380px_minmax(320px,0.95fr)_minmax(360px,1.05fr)]">
        <Panel title="Recent Matches" subtitle={`${recentMatches.length} latest`} actionLabel={matches.length > 5 ? "View all" : undefined}>
          <div className="space-y-3">
            {recentMatches.length === 0 ? (
              <EmptyPanelCopy text="No recent matches available." />
            ) : (
              recentMatches.map((match) => (
                <article
                  key={match.matchId}
                  className="relative overflow-hidden rounded-[20px] border border-white/7 bg-[linear-gradient(180deg,rgba(15,21,34,0.9),rgba(10,14,24,0.92))] p-3 transition duration-300 hover:border-white/15 hover:bg-white/[0.04]"
                >
                  <MapMatchBackdrop map={match.map} />
                  <div className="flex items-start gap-3">
                    <AgentAvatar agent={match.agent} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-display text-2xl leading-none text-white">{match.map}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.22em] text-white/40">{match.mode}</div>
                        </div>
                        <ResultBadge result={match.result} rrChange={match.rrChange} />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-white/72 sm:grid-cols-4">
                        <MiniStat label="KDA" value={`${match.kills}/${match.deaths}/${match.assists}`} />
                        <MiniStat label="ACS" value={String(match.acs)} />
                        <MiniStat label="ADR" value={String(match.adr)} />
                        <MiniStat label="HS%" value={`${match.headshotPct.toFixed(0)}%`} />
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </Panel>

        <div className="grid gap-5">
          <Panel title="Most Played Agents" subtitle={agents.length ? `${agents.length} tracked agents` : "No agent data"}>
            <div className="space-y-3">
              {agents.length === 0 ? (
                <EmptyPanelCopy text="No agent usage yet." />
              ) : (
                agents.slice(0, 3).map((agent) => (
                  <div key={agent.agent} className="rounded-[20px] border border-white/7 bg-white/[0.03] p-3">
                    <div className="flex items-center gap-3">
                      <AgentAvatar agent={agent.agent} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-display text-2xl leading-none text-white">{agent.agent}</div>
                            <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/40">
                              {getAgentAsset(agent.agent)?.role ?? "Agent"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-display text-3xl leading-none" style={{ color: theme.accent }}>
                              {agent.usage.toFixed(0)}%
                            </div>
                            <div className="text-[11px] uppercase tracking-[0.2em] text-white/40">Usage</div>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-sm text-white/70">
                          <MiniStat label="Matches" value={String(agent.games)} />
                          <MiniStat label="Win Rate" value={formatPercent(agent.winRate, 0)} />
                          <MiniStat label="ACS" value={String(agent.acs)} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel title="Map Performance" subtitle={maps.length ? `${maps.length} active maps` : "No map data"}>
            <div className="space-y-2.5">
              {maps.length === 0 ? (
                <EmptyPanelCopy text="No map performance data yet." />
              ) : (
                maps.map((mapRow) => (
                  <div key={mapRow.map} className="grid grid-cols-[minmax(0,1fr)_100px_72px] items-center gap-3 rounded-2xl border border-white/7 bg-white/[0.025] px-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <MapThumb map={mapRow.map} />
                      <div className="min-w-0 flex-1">
                      <div className="font-display text-xl leading-none text-white">{mapRow.map}</div>
                      <div className="mt-1 h-2 rounded-full bg-white/7">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(4, Math.min(100, mapRow.winRate))}%`,
                            background: `linear-gradient(90deg, ${theme.accent} 0%, color-mix(in srgb, ${theme.accent} 70%, white) 100%)`,
                          }}
                        />
                      </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-xl leading-none text-white">{formatPercent(mapRow.winRate, 0)}</div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Win rate</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-xl leading-none text-white">{mapRow.kd.toFixed(2)}</div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">K/D</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>

        <div className="grid gap-5">
          <Panel title="Result Breakdown" subtitle="Clean split across the recent sample">
            <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={outcomes} dataKey="value" innerRadius={58} outerRadius={86} paddingAngle={3}>
                      {outcomes.map((segment) => (
                        <Cell key={segment.name} fill={segment.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {outcomes.map((segment) => (
                  <div key={segment.name} className="flex items-center justify-between rounded-2xl border border-white/7 bg-white/[0.03] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
                      <span className="font-medium text-white">{segment.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-2xl leading-none text-white">{segment.value}</div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                        {matches.length ? `${Math.round((segment.value / matches.length) * 100)}%` : "0%"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="AI Insights" subtitle="Fast read on form, strengths, and climb path" actionLabel="View full analysis">
            <div className="grid gap-3 md:grid-cols-2">
              {insightCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-[22px] border p-4"
                  style={{
                    borderColor: card.border,
                    background: `linear-gradient(180deg, ${card.background} 0%, rgba(8, 12, 20, 0.88) 100%)`,
                  }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border" style={{ borderColor: card.border, background: "rgba(255,255,255,0.03)" }}>
                    <card.icon className="h-5 w-5" style={{ color: card.accent }} />
                  </div>
                  <div className="mt-4 font-display text-2xl leading-none text-white">{card.title}</div>
                  <p className="mt-2 text-sm leading-6 text-white/68">{card.body}</p>
                  <div className="mt-4 text-sm font-semibold" style={{ color: card.accent }}>
                    {card.highlight}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  sublabel,
  accentSoft,
  icon: Icon,
}: {
  label: string;
  value: string;
  sublabel: string;
  accentSoft: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div
      className="rounded-[24px] border p-4 transition duration-300 hover:-translate-y-1"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, rgba(13, 19, 31, 0.96) 0%, rgba(9, 13, 22, 0.94) 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl border"
        style={{ borderColor: accentSoft, background: `linear-gradient(180deg, ${accentSoft} 0%, rgba(255,255,255,0.02) 100%)` }}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="mt-5 text-[0.72rem] uppercase tracking-[0.22em] text-white/42">{label}</div>
      <div className="mt-2 font-display text-5xl leading-none text-white">{value}</div>
      <div className="mt-2 text-sm text-white/58">{sublabel}</div>
    </div>
  );
}

function ChartPanel({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-[24px] border p-4"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, rgba(13, 19, 31, 0.96) 0%, rgba(8, 12, 21, 0.95) 100%)",
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 48px -42px ${accent}`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-3xl leading-none text-white">{title}</div>
          <div className="mt-1 text-sm text-white/48">{subtitle}</div>
        </div>
        <div className="rounded-xl border border-white/8 px-3 py-2 text-xs uppercase tracking-[0.22em] text-white/62">
          Live
        </div>
      </div>
      <div className="mt-4 h-[252px]">{children}</div>
    </section>
  );
}

function Panel({
  title,
  subtitle,
  actionLabel,
  children,
}: {
  title: string;
  subtitle: string;
  actionLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,17,28,0.95),rgba(7,11,19,0.96))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-display text-3xl leading-none text-white">{title}</div>
          <div className="mt-1 text-sm text-white/48">{subtitle}</div>
        </div>
        {actionLabel ? <div className="text-sm text-white/55">{actionLabel}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[0.68rem] uppercase tracking-[0.2em] text-white/38">{label}</div>
      <div className="mt-2 font-display text-2xl leading-none text-white">{value}</div>
    </div>
  );
}

function AgentAvatar({ agent, size }: { agent?: string | null; size: "sm" | "md" }) {
  const asset = getAgentAsset(agent);
  const dimensions = size === "sm" ? "h-14 w-14" : "h-16 w-16";
  const imageSize = size === "sm" ? 56 : 64;

  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04]", dimensions)}>
      {asset ? (
        <>
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_60%)]"
          />
          <Image
            src={asset.portrait}
            alt={agent ?? "Agent"}
            width={imageSize}
            height={imageSize}
            className="absolute inset-0 h-full w-full object-cover object-top scale-[1.18]"
          />
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#050913] to-transparent" />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center font-display text-lg tracking-wide text-white/85">
          {agentMonogram(agent)}
        </div>
      )}
    </div>
  );
}

function MapThumb({ map }: { map?: string | null }) {
  const asset = getMapAsset(map);

  return (
    <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-xl border border-white/8 bg-white/[0.04]">
      {asset ? (
        <Image src={asset.splash} alt={map ?? "Map"} fill className="object-cover" />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-r from-[#06101a]/20 to-[#06101a]/55" />
    </div>
  );
}

function MapMatchBackdrop({ map }: { map?: string | null }) {
  const asset = getMapAsset(map);
  if (!asset) return null;

  return (
    <>
      <Image
        src={asset.splash}
        alt=""
        fill
        className="pointer-events-none object-cover opacity-[0.16]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,11,19,0.94),rgba(7,11,19,0.78),rgba(7,11,19,0.94))]" />
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/38">{label}</div>
      <div className="mt-1 font-medium text-white">{value}</div>
    </div>
  );
}

function ResultBadge({ result, rrChange }: { result: NormalizedMatch["result"]; rrChange: number | null }) {
  const tone =
    result === "win"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
      : result === "loss"
        ? "border-red-500/25 bg-red-500/10 text-red-300"
        : "border-white/10 bg-white/5 text-white/60";

  return (
    <div className={cn("rounded-2xl border px-3 py-2 text-right", tone)}>
      <div className="font-display text-lg uppercase tracking-[0.16em]">
        {result === "win" ? "Victory" : result === "loss" ? "Defeat" : "Draw"}
      </div>
      <div className="mt-1 text-xs uppercase tracking-[0.18em]">
        {typeof rrChange === "number" && Number.isFinite(rrChange)
          ? `${rrChange > 0 ? "+" : ""}${rrChange} RR`
          : "Recent form"}
      </div>
    </div>
  );
}

function EmptyPanelCopy({ text }: { text: string }) {
  return <p className="rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-5 text-sm text-white/55">{text}</p>;
}

function summarizeMatches(matches: NormalizedMatch[]) {
  const totals = matches.reduce(
    (acc, match) => {
      acc.kills += match.kills;
      acc.deaths += match.deaths;
      acc.acs += match.acs;
      acc.adr += match.adr;
      acc.hs += match.headshotPct;
      if (match.result === "win") acc.wins += 1;
      if (match.result === "loss") acc.losses += 1;
      return acc;
    },
    { kills: 0, deaths: 0, acs: 0, adr: 0, hs: 0, wins: 0, losses: 0 },
  );

  const sample = matches.length || 1;
  const decided = totals.wins + totals.losses || 1;

  return {
    kd: totals.kills / Math.max(1, totals.deaths),
    acs: totals.acs / sample,
    adr: totals.adr / sample,
    hs: totals.hs / sample,
    winRate: (totals.wins / decided) * 100,
  };
}

function summarizeAgents(matches: NormalizedMatch[]) {
  const totals = new Map<string, { games: number; wins: number; acs: number }>();

  for (const match of matches) {
    if (!match.agent) continue;
    const entry = totals.get(match.agent) ?? { games: 0, wins: 0, acs: 0 };
    entry.games += 1;
    entry.acs += match.acs;
    if (match.result === "win") entry.wins += 1;
    totals.set(match.agent, entry);
  }

  return [...totals.entries()]
    .map(([agent, values]) => ({
      agent,
      games: values.games,
      usage: matches.length ? (values.games / matches.length) * 100 : 0,
      winRate: values.games ? (values.wins / values.games) * 100 : 0,
      acs: Math.round(values.acs / Math.max(1, values.games)),
    }))
    .sort((a, b) => b.games - a.games);
}

function summarizeMaps(matches: NormalizedMatch[]) {
  const totals = new Map<string, { games: number; wins: number; kills: number; deaths: number }>();

  for (const match of matches) {
    const entry = totals.get(match.map) ?? { games: 0, wins: 0, kills: 0, deaths: 0 };
    entry.games += 1;
    entry.kills += match.kills;
    entry.deaths += match.deaths;
    if (match.result === "win") entry.wins += 1;
    totals.set(match.map, entry);
  }

  return [...totals.entries()]
    .map(([map, values]) => ({
      map,
      games: values.games,
      winRate: values.games ? (values.wins / values.games) * 100 : 0,
      kd: values.kills / Math.max(1, values.deaths),
    }))
    .sort((a, b) => b.games - a.games);
}

function buildOutcomeBreakdown(matches: NormalizedMatch[]) {
  const wins = matches.filter((match) => match.result === "win").length;
  const losses = matches.filter((match) => match.result === "loss").length;
  const draws = matches.filter((match) => match.result === "draw").length;

  return [
    { name: "Wins", value: wins, color: "#34d399" },
    { name: "Losses", value: losses, color: "#fb7185" },
    { name: "Draws", value: draws, color: "#94a3b8" },
  ];
}

function buildInsightCards({
  hs,
  agents,
  maps,
  history,
}: {
  hs: number;
  agents: Array<{ agent: string; games: number; usage: number; winRate: number; acs: number }>;
  maps: Array<{ map: string; games: number; winRate: number; kd: number }>;
  history: NormalizedMmrHistoryEntry[];
}) {
  const bestAgent = agents[0];
  const bestMap = [...maps].sort((a, b) => b.winRate - a.winRate)[0];
  const recentSwing = history.slice(-5).reduce((sum, entry) => sum + (entry.rrChange ?? 0), 0);

  return [
    {
      title: "Aim Discipline",
      body: hs >= 20 ? "Your headshot rate is holding above the healthy carry threshold." : "Mechanical output is stable, but there is still room to tighten first-bullet conversion.",
      highlight: hs >= 20 ? "Keep pressing clean duels" : "Sharpen opening accuracy",
      icon: Crosshair,
      accent: "#f4c95d",
      border: "rgba(244, 201, 93, 0.22)",
      background: "rgba(244, 201, 93, 0.08)",
    },
    {
      title: "Best Map",
      body: bestMap ? `Your strongest recent environment is ${bestMap.map}, where the round control is noticeably steadier.` : "No map trend has separated from the pack yet.",
      highlight: bestMap ? `${bestMap.map} at ${formatPercent(bestMap.winRate, 0)}` : "Need more map data",
      icon: MapIcon,
      accent: "#28f0d0",
      border: "rgba(40, 240, 208, 0.2)",
      background: "rgba(40, 240, 208, 0.08)",
    },
    {
      title: "Best Agent",
      body: bestAgent ? `${bestAgent.agent} is still your clearest comfort pick across the current sample.` : "No standout main has emerged yet.",
      highlight: bestAgent ? `${bestAgent.usage.toFixed(0)}% usage` : "Role still flexible",
      icon: BrainCircuit,
      accent: "#7aa2ff",
      border: "rgba(122, 162, 255, 0.2)",
      background: "rgba(122, 162, 255, 0.08)",
    },
    {
      title: "Climb Outlook",
      body: recentSwing >= 0 ? "Momentum is positive. The current line suggests the account is stabilizing and climbing again." : "Recent RR movement is soft. A cleaner win streak is needed to restore climb pace.",
      highlight: recentSwing >= 0 ? "Momentum trending up" : "Reset the climb rhythm",
      icon: TrendingUp,
      accent: recentSwing >= 0 ? "#8ef16a" : "#fb7185",
      border: recentSwing >= 0 ? "rgba(142, 241, 106, 0.2)" : "rgba(251, 113, 133, 0.2)",
      background: recentSwing >= 0 ? "rgba(142, 241, 106, 0.08)" : "rgba(251, 113, 133, 0.08)",
    },
  ];
}

function formatPercent(value: number, digits: number) {
  return `${value.toFixed(digits)}%`;
}

function outcomeRank(value: number, high: number, low: number) {
  if (value >= high) return "Strong trend";
  if (value <= low) return "Needs attention";
  return "Stable range";
}

function agentMonogram(agent?: string | null) {
  if (!agent) return "??";
  return agent
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
