"use client";

import Link from "next/link";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock3,
  Crosshair,
  Flame,
  Map,
  Radar,
  Shield,
  Sparkles,
  Swords,
  Target,
} from "lucide-react";
import { TeamEmblem } from "@/components/common/team-emblem";
import { RankBadge } from "@/components/common/rank-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, fmtInt, fmtNumber, initials, relativeTime } from "@/lib/utils";
import type { TeamSlug } from "@/lib/constants";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface PerformancePoint {
  label: string;
  acs: number;
  kd: number;
  adr: number;
  hs: number;
  result: "win" | "loss" | "draw" | "neutral";
}

interface AgentSummary {
  agent: string;
  games: number;
  winRate: number;
  acs: number | null;
}

interface MapSummary {
  map: string;
  matches: number;
  winRate: number;
  kd: number | null;
}

interface RecentMatchSummary {
  id: string;
  agent: string | null;
  map: string | null;
  playedAt: string | null;
  result: "win" | "loss" | "draw" | "neutral";
  scoreTeam: number | null;
  scoreOpponent: number | null;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  acs: number | null;
}

interface RoutineItemSummary {
  label: string;
  done: boolean;
}

interface ActivitySummary {
  id: string;
  who: string;
  avatarUrl: string | null;
  verb: string;
  createdAt: string;
}

interface TrackerDashboardProps {
  userName: string;
  userRole: string;
  teamName: string;
  teamSlug: TeamSlug;
  profile: {
    rank: string | null;
    rr: number | null;
    peakRank: string | null;
    lastSyncedAt: string | null;
  } | null;
  recentPerformance: PerformancePoint[];
  recentSummary: {
    wins: number;
    losses: number;
    draws: number;
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
  };
  agentStats: AgentSummary[];
  mapStats: MapSummary[];
  recentMatches: RecentMatchSummary[];
  routine: {
    title: string;
    done: number;
    total: number;
    items: RoutineItemSummary[];
  } | null;
  focusNote: {
    title: string | null;
    body: string | null;
  } | null;
  activity: ActivitySummary[];
  upcomingMatch: {
    title: string | null;
    kind: string | null;
    startAt: string | null;
    location: string | null;
    participants: number;
  } | null;
}

const QUICK_ACTIONS = [
  { label: "Live Match", href: "/matches", detail: "Track current match" },
  { label: "Log Match", href: "/matches/new", detail: "Add result manually" },
  { label: "AI Insights", href: "/insights", detail: "Review predictions" },
  { label: "Team Tasks", href: "/tasks", detail: "Open team board" },
];

const MARQUEE_ITEMS = [
  "Dashboard",
  "Stats Tracker",
  "AI Insights",
  "Match Log",
  "Team Chat",
  "Calendar",
  "Players",
  "Admin",
];

export function TrackerDashboard({
  userName,
  userRole,
  teamName,
  teamSlug,
  profile,
  recentPerformance,
  recentSummary,
  overview,
  agentStats,
  mapStats,
  recentMatches,
  routine,
  focusNote,
  activity,
  upcomingMatch,
}: TrackerDashboardProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (typeof window === "undefined") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.from("[data-tracker-hero]", {
        y: 28,
        autoAlpha: 0,
        duration: 0.7,
        ease: "power3.out",
      });

      gsap.from("[data-tracker-card]", {
        y: 34,
        autoAlpha: 0,
        duration: 0.72,
        stagger: 0.08,
        ease: "power3.out",
      });

      gsap.utils.toArray<HTMLElement>("[data-stack-card]").forEach((card, index) => {
        gsap.fromTo(
          card,
          { y: 72 + index * 12, autoAlpha: 0.45, scale: 0.985 },
          {
            y: 0,
            autoAlpha: 1,
            scale: 1,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top bottom-=90",
            },
          },
        );
      });
    },
    { scope: rootRef },
  );

  const rrProgress =
    typeof profile?.rr === "number" && Number.isFinite(profile.rr)
      ? Math.max(0, Math.min(100, profile.rr))
      : null;
  const resultBreakdown = [
    { name: "Wins", value: overview.wins, color: "#f6c453" },
    {
      name: "Losses",
      value: Math.max(overview.matchesPlayed - overview.wins, 0),
      color: "#4a4f57",
    },
  ].filter((entry) => entry.value > 0);

  return (
    <main
      ref={rootRef}
      className="overflow-x-hidden w-full max-w-full pb-6"
    >
      <section
        data-tracker-hero
        className="relative overflow-hidden rounded-[1.55rem] border border-white/7 bg-[linear-gradient(180deg,rgba(17,20,27,0.94)_0%,rgba(10,12,17,0.98)_100%)] px-6 py-7 shadow-[0_28px_70px_-42px_rgba(0,0,0,0.95)]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_left_top,rgba(246,196,83,0.16),transparent_32%),radial-gradient(circle_at_right_top,rgba(64,160,255,0.14),transparent_28%),linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_52%,transparent_100%)]" />
        <div className="pointer-events-none absolute inset-y-0 right-[34%] w-px bg-gradient-to-b from-transparent via-white/7 to-transparent" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-[34rem]">
            <div className="mb-3 flex items-center gap-3 text-[0.72rem] uppercase tracking-[0.34em] text-white/42">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--accent-soft)] bg-[color:var(--accent-dim)]">
                <TeamEmblem team={teamSlug} size="sm" />
              </span>
              {teamName}
            </div>
            <h1 className="font-display text-[clamp(2.7rem,4.4vw,4.9rem)] leading-[0.9] tracking-[0.02em] text-white">
              Welcome back,
              <span className="mx-2 inline-flex h-10 w-10 translate-y-1 items-center justify-center rounded-full border border-[color:var(--accent-soft)] bg-[color:var(--accent-dim)] align-middle shadow-[0_0_20px_-8px_var(--accent)]">
                <TeamEmblem team={teamSlug} size="sm" />
              </span>
              <span className="text-gold-metal">{userName}</span>
            </h1>
            <p className="mt-3 max-w-[30rem] text-base leading-7 text-white/56">
              Track every match, sharpen the details that matter, and keep the team board moving without losing the competitive edge.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[28rem] xl:max-w-[34rem] xl:flex-1">
            <HeaderPill
              icon={<Shield className="h-4 w-4" />}
              label="Queue"
              value={profile?.rank ? "Competitive" : "Tracking"}
            />
            <HeaderPill
              icon={<Radar className="h-4 w-4" />}
              label="Role"
              value={`${userRole} · ${teamName}`}
            />
            <HeaderPill
              icon={<Clock3 className="h-4 w-4" />}
              label="Sync"
              value={profile?.lastSyncedAt ? relativeTime(profile.lastSyncedAt) : "Pending"}
            />
          </div>
        </div>

        <div className="relative mt-6 overflow-hidden rounded-[1rem] border border-white/7 bg-black/18">
          <div className="tracker-marquee">
            <div className="tracker-marquee__inner">
              {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, index) => (
                <span
                  key={`${item}-${index}`}
                  className="inline-flex items-center gap-3 pr-8 text-[0.72rem] uppercase tracking-[0.3em] text-white/34"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]/75" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-12 xl:grid-flow-dense">
        <TrackerPanel
          className="xl:col-span-5"
          contentClassName="flex h-full flex-col gap-5"
          data-card
        >
          <PanelHeader
            title="Current Rank"
            action={
              <Link href="/stats" className="tracker-mini-link">
                Open Stats <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="grid flex-1 gap-5 md:grid-cols-[190px_1fr]">
            <div className="rounded-[1.2rem] border border-white/7 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-5">
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-[1.25rem] border border-[color:var(--accent-soft)] bg-[color:var(--accent-dim)] p-4 shadow-[0_0_28px_-14px_var(--accent)]">
                  <RankBadge rank={profile?.rank} rr={profile?.rr ?? null} className="flex-col gap-3 text-center" />
                </div>
                <div className="font-display text-[2rem] uppercase tracking-[0.06em]">
                  {profile?.rank ?? "Unranked"}
                </div>
                <div className="mt-1 text-sm tracking-[0.18em] text-white/54">
                  {typeof profile?.rr === "number" ? `${profile.rr} RR` : "No RR yet"}
                </div>
                <div className="mt-4 text-xs uppercase tracking-[0.24em] text-white/36">
                  Peak: {profile?.peakRank ?? "—"}
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-[0.72rem] uppercase tracking-[0.24em] text-white/42">
                  <span>Rank Rating</span>
                  <span>{typeof profile?.rr === "number" ? `${profile.rr} / 100 RR` : "Pending"}</span>
                </div>
                <div className="h-2 rounded-full bg-white/6">
                  <div
                    className="h-2 rounded-full bg-[linear-gradient(90deg,#e3ad3c_0%,#f6c453_100%)] shadow-[0_0_18px_-6px_rgba(246,196,83,0.85)]"
                    style={{ width: rrProgress != null ? `${rrProgress}%` : "8%" }}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MiniMetric label="Win %" value={formatPercent(overview.winRate)} />
                <MiniMetric label="K/D" value={fmtNumber(overview.kd, 2)} />
                <MiniMetric label="HS%" value={formatPercent(overview.headshot)} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Link href="/insights" className="tracker-action-button tracker-action-button--accent">
                  View Insights
                </Link>
                <Link href="/matches" className="tracker-action-button">
                  Match History
                </Link>
              </div>
            </div>
          </div>
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-4" data-card>
          <PanelHeader title="Recent Performance" />
          <div className="mt-1 flex items-end justify-between gap-4">
            <div className="text-sm text-white/48">Last 20 tracked matches</div>
            <div className="font-display text-[1.9rem] tracking-[0.04em]">
              <span className="text-green-400">{recentSummary.wins}W</span>
              <span className="px-2 text-white/20">·</span>
              <span className="text-red-400">{recentSummary.losses}L</span>
            </div>
          </div>

          <div className="mt-4 h-42">
            {recentPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={recentPerformance}>
                  <defs>
                    <linearGradient id="tracker-acs-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f6c453" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#f6c453" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" hide />
                  <YAxis hide domain={["dataMin - 20", "dataMax + 20"]} />
                  <Tooltip
                    cursor={{ stroke: "rgba(246,196,83,0.25)" }}
                    contentStyle={{
                      background: "#12151c",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 14,
                      color: "#f3f4f6",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="acs"
                    stroke="#f6c453"
                    strokeWidth={2.5}
                    fill="url(#tracker-acs-gradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyLineCard />
            )}
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {recentPerformance.slice(-12).map((point, index) => (
              <div
                key={`${point.label}-${index}`}
                className={cn(
                  "rounded-[0.45rem] px-1.5 py-1 text-center text-[0.58rem] font-semibold uppercase tracking-[0.2em]",
                  point.result === "win"
                    ? "bg-green-500/16 text-green-300"
                    : point.result === "loss"
                      ? "bg-red-500/16 text-red-300"
                      : "bg-white/6 text-white/40",
                )}
              >
                {point.result === "win" ? "W" : point.result === "loss" ? "L" : "•"}
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-4 gap-3 border-t border-white/6 pt-4">
            <MiniMetric label="K/D" value={fmtNumber(recentSummary.kd, 2)} />
            <MiniMetric label="ADR" value={fmtNumber(recentSummary.adr, 1)} />
            <MiniMetric label="ACS" value={fmtNumber(recentSummary.acs, 1)} />
            <MiniMetric label="HS%" value={formatPercent(recentSummary.hs)} />
          </div>
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-3" data-card>
          <PanelHeader
            title="Most Played Agents"
            action={
              <Link href="/stats" className="tracker-mini-link">
                All stats <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="mt-4 space-y-3">
            {agentStats.length > 0 ? (
              agentStats.slice(0, 4).map((agent) => (
                <div
                  key={agent.agent}
                  className="flex items-center gap-3 rounded-[1rem] border border-white/6 bg-white/[0.02] px-3 py-3"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-[0.9rem] border border-white/7 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] font-display text-sm uppercase tracking-[0.16em]">
                    {agent.agent.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{agent.agent}</div>
                    <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                      {agent.games} matches
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg">{formatPercent(agent.winRate)}</div>
                    <div className="text-xs text-white/34">{fmtNumber(agent.acs, 0)} ACS</div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyText>No tracked agent data yet.</EmptyText>
            )}
          </div>
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-12" contentClassName="py-0" data-card>
          <div className="grid gap-0 divide-y divide-white/7 md:grid-cols-3 md:divide-x md:divide-y-0 xl:grid-cols-6">
            <OverviewCell label="Matches Played" value={fmtInt(overview.matchesPlayed)} />
            <OverviewCell label="Wins" value={fmtInt(overview.wins)} />
            <OverviewCell label="Win %" value={formatPercent(overview.winRate)} />
            <OverviewCell label="K/D" value={fmtNumber(overview.kd, 2)} />
            <OverviewCell label="ADR" value={fmtNumber(overview.adr, 1)} />
            <OverviewCell label="ACS" value={fmtNumber(overview.acs, 1)} />
          </div>
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-5" data-card>
          <PanelHeader
            title="Recent Matches"
            action={
              <Link href="/matches" className="tracker-mini-link">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="mt-4 space-y-2">
            {recentMatches.length > 0 ? (
              recentMatches.map((match) => (
                <div
                  key={match.id}
                  className="grid grid-cols-[52px_1.2fr_1fr_auto] items-center gap-3 rounded-[0.95rem] border border-white/6 bg-white/[0.02] px-3 py-3"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-[0.9rem] border border-white/8 bg-black/18 font-display text-sm uppercase tracking-[0.14em]">
                    {match.agent?.slice(0, 2) ?? "—"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[0.72rem] uppercase tracking-[0.22em] text-white/34">
                      KDA
                    </div>
                    <div className="font-medium">
                      {fmtInt(match.kills)} / {fmtInt(match.deaths)} / {fmtInt(match.assists)}
                    </div>
                    <div className="text-xs text-white/38">
                      {match.map ?? "Unknown"} · {match.playedAt ? relativeTime(match.playedAt) : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[0.72rem] uppercase tracking-[0.22em] text-white/34">
                      Combat
                    </div>
                    <div className="font-medium">{fmtInt(match.acs)}</div>
                    <div className="text-xs text-white/38">
                      {match.scoreTeam != null && match.scoreOpponent != null
                        ? `${match.scoreTeam} - ${match.scoreOpponent}`
                        : "No score"}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                      match.result === "win"
                        ? "bg-green-500/16 text-green-300"
                        : match.result === "loss"
                          ? "bg-red-500/16 text-red-300"
                          : "bg-white/8 text-white/50",
                    )}
                  >
                    {match.result}
                  </div>
                </div>
              ))
            ) : (
              <EmptyText>No tracked matches yet.</EmptyText>
            )}
          </div>
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-4" data-card>
          <PanelHeader title="Map Performance" />
          <div className="mt-4 space-y-2">
            {mapStats.length > 0 ? (
              mapStats.slice(0, 5).map((entry) => (
                <div
                  key={entry.map}
                  className="grid grid-cols-[1.2fr_repeat(3,minmax(0,1fr))] gap-3 rounded-[0.95rem] border border-white/6 bg-white/[0.02] px-3 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{entry.map}</div>
                  </div>
                  <DataColumn label="Matches" value={fmtInt(entry.matches)} />
                  <DataColumn label="Win %" value={formatPercent(entry.winRate)} />
                  <DataColumn label="K/D" value={fmtNumber(entry.kd, 2)} />
                </div>
              ))
            ) : (
              <EmptyText>No map data yet.</EmptyText>
            )}
          </div>
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-3" data-card>
          <PanelHeader title="Command Board" />
          <div className="mt-4 grid gap-4">
            <div className="rounded-[1rem] border border-white/6 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium">Routine Progress</div>
                <span className="text-xs uppercase tracking-[0.2em] text-white/34">
                  {routine ? `${routine.done}/${routine.total}` : "—"}
                </span>
              </div>
              <div className="mb-3 h-2 rounded-full bg-white/6">
                <div
                  className="h-2 rounded-full bg-[linear-gradient(90deg,#e4af43_0%,#f6c453_100%)]"
                  style={{
                    width: routine && routine.total > 0 ? `${(routine.done / routine.total) * 100}%` : "0%",
                  }}
                />
              </div>
              <div className="space-y-2">
                {(routine?.items ?? []).slice(0, 3).map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-sm text-white/72">
                    <CheckCircle2
                      className={cn(
                        "h-4 w-4",
                        item.done ? "text-[color:var(--accent)]" : "text-white/20",
                      )}
                    />
                    <span>{item.label}</span>
                  </div>
                ))}
                {!routine ? <EmptyText>No daily routine assigned.</EmptyText> : null}
              </div>
            </div>

            <div className="grid gap-2">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group overflow-hidden rounded-[1rem] border border-white/7 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-4 py-3 transition duration-500 ease-out hover:border-[color:var(--accent-soft)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{action.label}</div>
                      <div className="text-xs uppercase tracking-[0.18em] text-white/34">
                        {action.detail}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-white/28 transition duration-500 group-hover:translate-x-1 group-hover:text-[color:var(--accent)]" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-7" data-card data-stack-card>
          <PanelHeader title="Team Intel" />
          <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[1rem] border border-white/6 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-[color:var(--accent)]" />
                Weekly Focus
              </div>
              <div className="font-display text-[1.7rem] leading-none tracking-[0.03em]">
                {focusNote?.title ?? "Keep the board disciplined."}
              </div>
              <p className="mt-3 max-w-[36rem] text-sm leading-7 text-white/54">
                {focusNote?.body ?? "No coach note is pinned yet. Use the match log and team notes to keep the focus visible before scrims."}
              </p>
              <Link href="/matches" className="tracker-mini-link mt-5 inline-flex">
                Open match log <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="rounded-[1rem] border border-white/6 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Flame className="h-4 w-4 text-[color:var(--accent)]" />
                Recent Activity
              </div>
              <div className="space-y-3">
                {activity.length > 0 ? (
                  activity.slice(0, 4).map((event) => (
                    <div key={event.id} className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-white/8">
                        {event.avatarUrl ? (
                          <AvatarImage src={event.avatarUrl} alt={event.who} />
                        ) : null}
                        <AvatarFallback>{initials(event.who)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm">
                          <span className="font-medium">{event.who}</span>{" "}
                          <span className="text-white/54">{event.verb}</span>
                        </div>
                        <div className="text-[0.68rem] uppercase tracking-[0.22em] text-white/30">
                          {relativeTime(event.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyText>No recent activity yet.</EmptyText>
                )}
              </div>
            </div>
          </div>
        </TrackerPanel>

        <TrackerPanel className="xl:col-span-5" data-card data-stack-card>
          <PanelHeader title="Match Ops" />
          <div className="mt-4 grid gap-4">
            <div className="rounded-[1rem] border border-white/6 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Swords className="h-4 w-4 text-[color:var(--accent)]" />
                Upcoming Match
              </div>
              <div className="font-display text-[1.75rem] leading-none tracking-[0.04em]">
                {upcomingMatch?.title ?? "No match scheduled"}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <InfoStat icon={<Map className="h-4 w-4" />} label="Type" value={upcomingMatch?.kind ?? "Open"} />
                <InfoStat
                  icon={<Calendar className="h-4 w-4" />}
                  label="Date"
                  value={
                    upcomingMatch?.startAt
                      ? new Date(upcomingMatch.startAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      : "TBD"
                  }
                />
                <InfoStat
                  icon={<Target className="h-4 w-4" />}
                  label="Roster"
                  value={upcomingMatch ? `${upcomingMatch.participants}/5` : "Pending"}
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/calendar" className="tracker-action-button tracker-action-button--accent">
                  Open Calendar
                </Link>
                <Link href="/players" className="tracker-action-button">
                  Review Players
                </Link>
              </div>
            </div>

            <div className="rounded-[1rem] border border-white/6 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Crosshair className="h-4 w-4 text-[color:var(--accent)]" />
                Match Mix
              </div>
              {resultBreakdown.length > 0 ? (
                <div className="grid items-center gap-3 sm:grid-cols-[140px_1fr]">
                  <div className="h-[130px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={resultBreakdown}
                          dataKey="value"
                          innerRadius={34}
                          outerRadius={52}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {resultBreakdown.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {resultBreakdown.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between text-sm">
                        <span className="inline-flex items-center gap-2 text-white/58">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          {entry.name}
                        </span>
                        <span className="font-medium">{fmtInt(entry.value)}</span>
                      </div>
                    ))}
                    <div className="border-t border-white/6 pt-3">
                      <div className="text-[0.7rem] uppercase tracking-[0.2em] text-white/32">
                        Headshot %
                      </div>
                      <div className="mt-1 font-display text-[1.9rem]">
                        {formatPercent(overview.headshot)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyText>More tracked matches will unlock the match mix view.</EmptyText>
              )}
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
  dataCard,
}: {
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
  dataCard?: boolean;
}) {
  return (
    <section
      data-tracker-card={dataCard ? "true" : undefined}
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

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.9rem] border border-white/6 bg-white/[0.02] px-3 py-3">
      <div className="text-[0.66rem] uppercase tracking-[0.2em] text-white/34">{label}</div>
      <div className="mt-1 font-display text-[1.7rem] leading-none">{value}</div>
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

function DataColumn({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[0.62rem] uppercase tracking-[0.18em] text-white/30">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function HeaderPill({
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
    <div className="rounded-[0.9rem] border border-white/6 bg-black/16 px-3 py-3">
      <div className="flex items-center gap-2 text-[0.66rem] uppercase tracking-[0.18em] text-white/32">
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

function EmptyLineCard() {
  return (
    <div className="flex h-full items-center justify-center rounded-[1rem] border border-dashed border-white/8 bg-white/[0.02] text-sm text-white/38">
      Track more matches to build the performance curve.
    </div>
  );
}

function formatPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}
