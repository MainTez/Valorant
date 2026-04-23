"use client";

import Image from "next/image";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  ArrowUpRight,
  BrainCircuit,
  ChevronDown,
  Crosshair,
  Crown,
  Map as MapIcon,
  Shield,
  Sparkles,
  Swords,
  Target,
  TrendingUp,
  Trophy,
  Users,
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
import { getAgentAsset, getAgentIcon, getMapAsset } from "@/lib/valorant/assets";
import { getCompetitiveTierAsset, getRankTheme } from "@/lib/valorant/ranks";
import { cn } from "@/lib/utils";
import type {
  NormalizedAccount,
  NormalizedMMR,
  NormalizedMatch,
  NormalizedMmrHistoryEntry,
} from "@/types/domain";

const DASHBOARD_ACCENT = "#d6a74a";
const DASHBOARD_ACCENT_SOFT = "rgba(214,167,74,0.18)";
const PANEL_CLASS =
  "rounded-[24px] border border-[#d6a74a]/12 bg-[linear-gradient(180deg,rgba(18,16,14,0.98)_0%,rgba(10,12,17,0.99)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

interface Props {
  account: NormalizedAccount;
  mmr: NormalizedMMR | null;
  matches: NormalizedMatch[];
  history: NormalizedMmrHistoryEntry[];
  region: string;
  onTeam?: boolean;
  insightsHref: string;
  playerHrefBase: string;
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
  playerHrefBase,
}: Props) {
  const theme = getRankTheme(mmr?.currentTierId, mmr?.currentTier);
  const rankAsset = getCompetitiveTierAsset(mmr?.currentTierId);
  const summary = summarizeMatches(matches);
  const recentMatches = matches.slice(0, 6);
  const agents = summarizeAgents(matches);
  const maps = summarizeMaps(matches);
  const outcomes = buildOutcomeBreakdown(matches);
  const trendData = [...matches].reverse().map((match) => ({
    label: new Date(match.startedAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    acs: match.acs,
  }));
  const rrSeries = history
    .slice(-14)
    .map((entry) => ({
      label: new Date(entry.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      delta: entry.rrChange ?? 0,
    }))
    .reduce<Array<{ label: string; rr: number }>>((acc, entry) => {
      const previous = acc[acc.length - 1]?.rr ?? 0;
      acc.push({ label: entry.label, rr: previous + entry.delta });
      return acc;
    }, []);
  const insightCards = buildInsightCards({
    hs: summary.hs,
    agents,
    maps,
    history,
  });

  const metricTiles = [
    {
      label: "Win Rate",
      value: formatPercent(summary.winRate, 1),
      sublabel: outcomeRank(summary.winRate, 52, 44),
      icon: Trophy,
    },
    {
      label: "K/D",
      value: summary.kd.toFixed(2),
      sublabel: outcomeRank(summary.kd, 1.25, 0.95),
      icon: Crosshair,
    },
    {
      label: "ACS",
      value: summary.acs.toFixed(1),
      sublabel: outcomeRank(summary.acs, 240, 190),
      icon: Target,
    },
    {
      label: "ADR",
      value: summary.adr.toFixed(1),
      sublabel: outcomeRank(summary.adr, 155, 125),
      icon: Swords,
    },
    {
      label: "HS%",
      value: formatPercent(summary.hs, 1),
      sublabel: outcomeRank(summary.hs, 22, 15),
      icon: Crown,
    },
    {
      label: "Matches",
      value: String(matches.length),
      sublabel: "Core queue sample",
      icon: Users,
    },
  ];

  const currentRR = mmr?.currentRR ?? 0;
  const rrProgress = Math.max(0, Math.min(100, currentRR));

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className="rounded-[28px] border border-[#d6a74a]/14 bg-[linear-gradient(180deg,rgba(21,18,14,0.98)_0%,rgba(9,11,16,1)_100%)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-white/10 bg-white/5 text-white/75">
                  {region.toUpperCase()}
                </Badge>
                {onTeam ? (
                  <Badge className="border-transparent bg-white/8 text-white">Roster</Badge>
                ) : (
                  <Badge variant="outline" className="border-white/10 bg-white/5 text-white/65">
                    External
                  </Badge>
                )}
              </div>
              <h1 className="mt-4 font-display text-5xl leading-none tracking-tight text-white">
                {account.name}
                <span className="ml-2 text-white/35">#{account.tag}</span>
              </h1>
              <p className="mt-3 text-sm text-white/54">
                Clean competitive-only tracker using official Riot rank, map, and agent assets.
              </p>
            </div>
            <div
              className="rounded-2xl border px-3 py-2 text-xs uppercase tracking-[0.22em]"
              style={{ borderColor: theme.ring, color: theme.accent }}
            >
              Live
            </div>
          </div>

          <div className="mt-6 flex items-center gap-5">
            <div
              className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[24px] border bg-black/20"
              style={{
                borderColor: theme.ring,
                boxShadow: `inset 0 0 24px ${theme.accentSoft}`,
              }}
            >
              {rankAsset ? (
                <Image
                  src={rankAsset.largeIcon}
                  alt={mmr?.currentTier ?? "Rank emblem"}
                  width={88}
                  height={88}
                />
              ) : (
                <Shield className="h-10 w-10 text-white/55" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[0.72rem] uppercase tracking-[0.24em] text-white/42">
                Current Rank
              </div>
              <div
                className="mt-2 font-display text-4xl leading-none tracking-tight"
                style={{ color: theme.accent }}
              >
                {mmr?.currentTier ?? "Unranked"}
              </div>
              <div className="mt-3 font-display text-2xl text-white">
                {currentRR} RR
              </div>
              <div className="mt-2 text-sm text-white/48">
                Peak {mmr?.peakTier ?? mmr?.currentTier ?? "Unranked"}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="h-2.5 rounded-full bg-white/7">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${rrProgress}%`,
                  background: `linear-gradient(90deg, ${theme.accent} 0%, color-mix(in srgb, ${theme.accent} 72%, white) 100%)`,
                }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs uppercase tracking-[0.18em] text-white/38">
              <span>0 RR</span>
              <span>{rrProgress}/100 RR</span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
            <MetaBlock label="Region" value={region.toUpperCase()} />
            <MetaBlock label="Level" value={account.accountLevel ? String(account.accountLevel) : "N/A"} />
            <MetaBlock label="Board" value={mmr?.leaderboardPlace ? `#${mmr.leaderboardPlace}` : "N/A"} />
          </div>

          <Link
            href={insightsHref}
            className="mt-5 flex items-center justify-center gap-2 rounded-2xl border px-4 py-4 text-sm font-semibold uppercase tracking-[0.14em] transition hover:border-white/20 hover:bg-white/[0.04]"
            style={{ borderColor: "rgba(214,167,74,0.24)", color: DASHBOARD_ACCENT }}
          >
            <Sparkles className="h-4 w-4" />
            Open AI Analysis
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </section>

        <section className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-6">
            {metricTiles.map((tile) => (
              <MetricTile
                key={tile.label}
                {...tile}
                accent={DASHBOARD_ACCENT}
                accentSoft={DASHBOARD_ACCENT_SOFT}
              />
            ))}
          </div>

          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)]">
            <ChartPanel title="ACS Trend" subtitle={`Last ${trendData.length} core matches`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="dashboard-acs-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={DASHBOARD_ACCENT} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={DASHBOARD_ACCENT} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                  <XAxis dataKey="label" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.28)" fontSize={11} tickLine={false} axisLine={false} width={34} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                  <Area type="monotone" dataKey="acs" stroke={DASHBOARD_ACCENT} strokeWidth={2.25} fill="url(#dashboard-acs-fill)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel title="RR Progression" subtitle={rrSeries.length ? "Recent MMR history" : "No RR history yet"}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rrSeries}>
                  <defs>
                    <linearGradient id="dashboard-rr-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={DASHBOARD_ACCENT} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={DASHBOARD_ACCENT} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                  <XAxis dataKey="label" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.28)" fontSize={11} tickLine={false} axisLine={false} width={42} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                  <Area type="monotone" dataKey="rr" stroke={DASHBOARD_ACCENT} strokeWidth={2.25} fill="url(#dashboard-rr-fill)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Panel title="Recent Matches" subtitle="Competitive-only recent history">
          <div className="space-y-3">
            {recentMatches.length === 0 ? (
              <EmptyPanelCopy text="No competitive matches available." />
            ) : (
              recentMatches.map((match) => (
                <RecentMatchCard
                  key={match.matchId}
                  match={match}
                  href={`${playerHrefBase}/matches/${encodeURIComponent(match.matchId)}?region=${region}`}
                />
              ))
            )}
          </div>
        </Panel>

        <div className="grid gap-5">
          <Panel title="Result Split" subtitle="Core sample only">
            <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
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
                  <div key={segment.name} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
                      <span className="text-white">{segment.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-2xl leading-none text-white">{segment.value}</div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                        {matches.length ? `${Math.round((segment.value / matches.length) * 100)}%` : "0%"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.2fr)]">
        <Panel title="Most Played Agents" subtitle="Official Riot agent icons">
          <div className="space-y-3">
            {agents.length === 0 ? (
              <EmptyPanelCopy text="No agent usage available." />
            ) : (
              agents.slice(0, 4).map((agent) => (
                <div key={agent.agent} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                  <AgentIcon agent={agent.agent} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-display text-2xl leading-none text-white">{agent.agent}</div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/38">
                          {getAgentAsset(agent.agent)?.role ?? "Agent"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-2xl leading-none text-white">
                          {agent.usage.toFixed(0)}%
                        </div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">Usage</div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm text-white/68">
                      <MiniStat label="Matches" value={String(agent.games)} />
                      <MiniStat label="Win Rate" value={formatPercent(agent.winRate, 0)} />
                      <MiniStat label="ACS" value={String(agent.acs)} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Map Performance" subtitle="Official Riot map icons">
          <div className="space-y-3">
            {maps.length === 0 ? (
              <EmptyPanelCopy text="No map performance available." />
            ) : (
              maps.map((mapRow) => (
                <div key={mapRow.map} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                  <div className="flex items-center gap-3">
                    <MapIconBadge map={mapRow.map} />
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-2xl leading-none text-white">{mapRow.map}</div>
                      <div className="mt-2 h-2 rounded-full bg-white/7">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(4, Math.min(100, mapRow.winRate))}%`,
                            background: `linear-gradient(90deg, ${DASHBOARD_ACCENT} 0%, color-mix(in srgb, ${DASHBOARD_ACCENT} 72%, white) 100%)`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-white/68">
                    <MiniStat label="Win Rate" value={formatPercent(mapRow.winRate, 0)} />
                    <MiniStat label="K/D" value={mapRow.kd.toFixed(2)} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="AI Insights" subtitle="Quick read from the current ranked sample" action={<Link href={insightsHref} className="text-sm text-white/58 hover:text-white">View full analysis</Link>}>
          <div className="grid gap-3 md:grid-cols-2">
            {insightCards.map((card) => (
              <div
                key={card.title}
                className="rounded-[22px] border p-4"
                style={{
                  borderColor: card.border,
                  background: `linear-gradient(180deg, ${card.background} 0%, rgba(8,12,20,0.88) 100%)`,
                }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border" style={{ borderColor: card.border }}>
                  <card.icon className="h-5 w-5" style={{ color: card.accent }} />
                </div>
                <div className="mt-4 font-display text-2xl leading-none text-white">{card.title}</div>
                <p className="mt-2 text-sm leading-6 text-white/66">{card.body}</p>
                <div className="mt-4 text-sm font-semibold" style={{ color: card.accent }}>
                  {card.highlight}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  sublabel,
  accent,
  accentSoft,
  icon: Icon,
}: {
  label: string;
  value: string;
  sublabel: string;
  accent: string;
  accentSoft: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-[22px] border border-[#d6a74a]/12 bg-[linear-gradient(180deg,rgba(18,16,14,0.98)_0%,rgba(10,12,17,0.99)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div
        className="flex h-11 w-11 items-center justify-center rounded-2xl border"
        style={{ borderColor: accentSoft, background: `${accentSoft}` }}
      >
        <div style={{ color: accent }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 text-[0.72rem] uppercase tracking-[0.22em] text-white/42">{label}</div>
      <div className="mt-2 font-display text-5xl leading-none text-white">{value}</div>
      <div className="mt-2 text-sm text-white/56">{sublabel}</div>
    </div>
  );
}

function ChartPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className={PANEL_CLASS}>
      <div>
        <div className="font-display text-3xl leading-none text-white">{title}</div>
        <div className="mt-1 text-sm text-white/48">{subtitle}</div>
      </div>
      <div className="mt-4 h-[252px]">{children}</div>
    </section>
  );
}

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={PANEL_CLASS}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-display text-3xl leading-none text-white">{title}</div>
          <div className="mt-1 text-sm text-white/48">{subtitle}</div>
        </div>
        {action ?? null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-[0.68rem] uppercase tracking-[0.2em] text-white/38">{label}</div>
      <div className="mt-2 font-display text-2xl leading-none text-white">{value}</div>
    </div>
  );
}

function AgentIcon({ agent }: { agent?: string | null }) {
  const icon = getAgentIcon(agent);

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
      {icon ? (
        <Image src={icon} alt={agent ?? "Agent"} width={28} height={28} className="h-7 w-7 object-contain" />
      ) : (
        <span className="font-display text-sm text-white/65">{agentMonogram(agent)}</span>
      )}
    </div>
  );
}

function MapPill({ map }: { map?: string | null }) {
  return (
    <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5">
      <span className="text-xs uppercase tracking-[0.18em] text-white/72">{map ?? "Unknown"}</span>
    </div>
  );
}

function MapIconBadge({ map }: { map?: string | null }) {
  const asset = getMapAsset(map);

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-[#d6a74a]/14 bg-[linear-gradient(180deg,rgba(33,29,24,0.92)_0%,rgba(14,16,22,0.98)_100%)]">
      {asset?.icon ? (
        <Image
          src={asset.icon}
          alt={map ?? "Map"}
          width={38}
          height={38}
          className="h-9 w-9 object-contain opacity-95"
        />
      ) : (
        <MapIcon className="h-5 w-5 text-white/55" />
      )}
    </div>
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

function RecentMatchCard({ match, href }: { match: NormalizedMatch; href: string }) {
  const agentAsset = getAgentAsset(match.agent);
  const mapAsset = getMapAsset(match.map);

  return (
    <Link
      href={href}
      className={cn(
        "grid gap-4 overflow-hidden rounded-[24px] border bg-[linear-gradient(180deg,rgba(10,15,24,0.98)_0%,rgba(8,12,19,0.98)_100%)] p-4 transition hover:-translate-y-[1px] hover:border-[#d6a74a]/35 md:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(248px,0.38fr)]",
        match.result === "win"
          ? "border-emerald-500/40 shadow-[inset_1px_0_0_rgba(16,185,129,0.35)]"
          : match.result === "loss"
            ? "border-rose-500/38 shadow-[inset_1px_0_0_rgba(244,63,94,0.3)]"
            : "border-[#d6a74a]/14",
      )}
    >
      <div className="flex items-start gap-4">
        <div className="relative h-[86px] w-[86px] shrink-0 overflow-hidden rounded-[18px] border border-white/12 bg-[linear-gradient(180deg,rgba(37,44,56,0.9)_0%,rgba(12,16,24,0.98)_100%)]">
          {agentAsset?.portrait ? (
            <Image
              src={agentAsset.portrait}
              alt={match.agent ?? "Agent"}
              fill
              sizes="86px"
              className="object-cover object-top scale-[1.08]"
            />
          ) : (
            <div className="grid h-full w-full place-items-center font-display text-xl text-white/65">
              {agentMonogram(match.agent)}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-12 bg-[linear-gradient(180deg,transparent,rgba(2,6,12,0.92))]" />
          <div className="absolute bottom-1 left-1 rounded-full border border-[#d6a74a]/30 bg-[rgba(9,12,18,0.88)] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[#f0c462]">
            {agentAsset?.role ?? "Agent"}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <MapPill map={match.map} />
            <span className="text-[11px] uppercase tracking-[0.26em] text-white/38">{match.mode}</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-5">
            <MiniStat label="Score" value={`${match.scoreTeam} - ${match.scoreOpponent}`} />
            <MiniStat label="KDA" value={`${match.kills}/${match.deaths}/${match.assists}`} />
            <MiniStat label="ACS" value={String(match.acs)} />
            <MiniStat label="ADR" value={String(match.adr)} />
            <MiniStat label="HS%" value={`${match.headshotPct.toFixed(0)}%`} />
          </div>
        </div>
      </div>

      <MatchResultRail
        map={match.map}
        result={match.result}
        score={`${match.scoreTeam} - ${match.scoreOpponent}`}
        rrChange={match.rrChange}
        splash={mapAsset?.splash ?? null}
      />
    </Link>
  );
}

function MatchResultRail({
  map,
  result,
  score,
  rrChange,
  splash,
}: {
  map: string;
  result: NormalizedMatch["result"];
  score: string;
  rrChange: number | null;
  splash: string | null;
}) {
  const tone =
    result === "win"
      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
      : result === "loss"
        ? "border-rose-500/35 bg-rose-500/10 text-rose-300"
        : "border-[#d6a74a]/20 bg-white/5 text-white/60";

  return (
    <div className={cn("grid min-h-[126px] overflow-hidden rounded-[20px] border md:grid-cols-[1.1fr_0.9fr]", tone)}>
      <div className="flex flex-col justify-between p-4">
        <div className="font-display text-[2rem] uppercase leading-none tracking-[0.08em]">
          {result === "win" ? "Victory" : result === "loss" ? "Defeat" : "Draw"}
        </div>
        <div className="font-display text-[2rem] leading-none text-white">{score}</div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-white/44">
          {typeof rrChange === "number" && Number.isFinite(rrChange)
            ? `${rrChange > 0 ? "+" : ""}${rrChange} RR`
            : map}
        </div>
      </div>
      <div className="relative min-h-[126px] border-l border-white/10">
        {splash ? (
          <Image
            src={splash}
            alt={map}
            fill
            sizes="(min-width: 1280px) 220px, 100vw"
            className="object-cover"
          />
        ) : null}
        <div
          className={cn(
            "absolute inset-0",
            result === "win"
              ? "bg-[linear-gradient(135deg,rgba(2,8,13,0.15)_0%,rgba(6,78,59,0.74)_100%)]"
              : result === "loss"
                ? "bg-[linear-gradient(135deg,rgba(2,8,13,0.15)_0%,rgba(127,29,29,0.74)_100%)]"
                : "bg-[linear-gradient(135deg,rgba(2,8,13,0.2)_0%,rgba(89,69,24,0.72)_100%)]",
          )}
        />
        <div className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/14 bg-black/28 text-white/86">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function EmptyPanelCopy({ text }: { text: string }) {
  return <p className="rounded-2xl border border-[#d6a74a]/10 bg-white/[0.025] px-4 py-5 text-sm text-white/55">{text}</p>;
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
      body: hs >= 20
        ? "Headshot rate is sitting in a healthy carry range across the core queues."
        : "Mechanical output is stable, but first-bullet precision still has room to tighten.",
      highlight: hs >= 20 ? "Keep pressing clean duels" : "Sharpen opening accuracy",
      icon: Crosshair,
      accent: "#f0c462",
      border: "rgba(214, 167, 74, 0.22)",
      background: "rgba(214, 167, 74, 0.08)",
    },
    {
      title: "Best Map",
      body: bestMap
        ? `${bestMap.map} is your strongest recent environment on the current sample.`
        : "No map has separated itself from the pack yet.",
      highlight: bestMap ? `${bestMap.map} at ${formatPercent(bestMap.winRate, 0)}` : "Need more map data",
      icon: MapIcon,
      accent: "#dcb56b",
      border: "rgba(214, 167, 74, 0.18)",
      background: "rgba(214, 167, 74, 0.06)",
    },
    {
      title: "Best Agent",
      body: bestAgent
        ? `${bestAgent.agent} remains the clearest comfort pick in this ranked sample.`
        : "No standout main has emerged yet.",
      highlight: bestAgent ? `${bestAgent.usage.toFixed(0)}% usage` : "Role still flexible",
      icon: BrainCircuit,
      accent: "#dcb56b",
      border: "rgba(214, 167, 74, 0.18)",
      background: "rgba(214, 167, 74, 0.06)",
    },
    {
      title: "Climb Outlook",
      body: recentSwing >= 0
        ? "Recent RR movement is stable to positive, so the climb is still alive."
        : "Recent RR movement softened. A cleaner win stretch is needed to rebuild pace.",
      highlight: recentSwing >= 0 ? "Momentum trending up" : "Reset the climb rhythm",
      icon: TrendingUp,
      accent: recentSwing >= 0 ? "#f0c462" : "#d89773",
      border: recentSwing >= 0 ? "rgba(214, 167, 74, 0.2)" : "rgba(216, 151, 115, 0.22)",
      background: recentSwing >= 0 ? "rgba(214, 167, 74, 0.08)" : "rgba(216, 151, 115, 0.08)",
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
