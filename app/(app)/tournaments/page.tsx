import { notFound } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Shield,
  Table2,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/auth/get-session";
import { formatNorwayDateTime } from "@/lib/timezone";
import {
  type GGArenaSnapshot,
  getSurfBullsArenaSnapshot,
} from "@/lib/ggarena/client";
import type {
  GGArenaMatchup,
  GGArenaStandingRow,
  GGArenaStatRow,
} from "@/lib/ggarena/normalize";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tournaments" };

export default async function TournamentsPage() {
  const { team } = await requireSession();
  if (team.slug !== "surf-n-bulls") notFound();

  const snapshot = await getSurfBullsArenaSnapshot();

  return (
    <div className="flex max-w-[1400px] flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="eyebrow">GGarena</div>
          <h1 className="mt-1 font-display text-3xl tracking-wide">
            Surf&apos;n Bulls tournaments
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[color:var(--color-muted)]">
            Official fixtures, opponents, tables, and tournament stat lines from GGarena.
          </p>
        </div>
        <a
          href="https://www.ggarena.no"
          target="_blank"
          rel="noreferrer"
          className="btn-ghost"
        >
          <ExternalLink className="h-4 w-4" />
          GGarena
        </a>
      </header>

      {snapshot.status === "ready" ? (
        <TournamentDashboard snapshot={snapshot} />
      ) : (
        <UnavailableState snapshot={snapshot} />
      )}
    </div>
  );
}

function TournamentDashboard({ snapshot }: { snapshot: GGArenaSnapshot }) {
  const next = snapshot.nextMatchups[0] ?? null;
  const surfStanding = snapshot.standings.find((row) => row.isSurfBulls) ?? null;

  return (
    <>
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.9fr_0.9fr]">
        <NextTournamentMatch matchup={next} updatedAt={snapshot.updatedAt} />
        <SummaryTile
          icon={Trophy}
          label="Competitions"
          value={snapshot.competitions.length || snapshot.divisions.length}
          detail={snapshot.club?.name ?? "Surf'n Bulls"}
        />
        <SummaryTile
          icon={Table2}
          label="Table"
          value={surfStanding?.rank ? `#${surfStanding.rank}` : "Live"}
          detail={formatStandingDetail(surfStanding)}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <MatchupList title="Next fixtures" matchups={snapshot.nextMatchups} empty="No upcoming fixtures returned." />
        <MatchupList title="Recent officials" matchups={snapshot.recentMatchups} empty="No recent tournament results returned." />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
        <StandingsTable rows={snapshot.standings} />
        <StatsTable rows={snapshot.stats} />
      </section>

      {snapshot.warnings.length > 0 ? (
        <section className="surface p-4">
          <div className="flex items-start gap-3 text-sm text-[color:var(--color-muted)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-warning)]" />
            <div className="space-y-1">
              {snapshot.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

function UnavailableState({ snapshot }: { snapshot: GGArenaSnapshot }) {
  const isMissingKey = snapshot.status === "missing-api-key";
  return (
    <section className="surface p-6">
      <EmptyState
        icon={isMissingKey ? Shield : AlertTriangle}
        title={isMissingKey ? "GGarena is not configured" : "GGarena feed unavailable"}
        description={snapshot.message ?? snapshot.warnings[0] ?? "No tournament data returned."}
      />
      {snapshot.warnings.length > 0 ? (
        <div className="mt-4 rounded-lg border border-white/8 bg-white/[0.02] p-4 text-sm text-[color:var(--color-muted)]">
          {snapshot.warnings.map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function NextTournamentMatch({
  matchup,
  updatedAt,
}: {
  matchup: GGArenaMatchup | null;
  updatedAt: string;
}) {
  return (
    <div className="surface-accent relative min-h-[270px] overflow-hidden p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            "radial-gradient(circle at 82% 20%, var(--accent-dim), transparent 52%), linear-gradient(135deg, rgba(255,255,255,0.08), transparent 35%)",
        }}
      />
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between gap-3">
          <span className="eyebrow">Next Tournament Match</span>
          <Badge>
            <span className="accent-dot" />
            {matchup?.status ?? "pending"}
          </Badge>
        </div>

        {matchup ? (
          <div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <TeamBlock name="Surf'n Bulls" active />
            <div className="font-display text-4xl tracking-[0.2em] text-[color:var(--color-muted)]">
              VS
            </div>
            <TeamBlock name={matchup.opponentName ?? "Opponent TBD"} />
          </div>
        ) : (
          <div className="mt-10 flex flex-1 items-center justify-center text-center">
            <div>
              <Shield className="mx-auto h-9 w-9 text-[color:var(--color-muted)]" />
              <div className="mt-3 font-display text-2xl tracking-wide">
                Fixture pending
              </div>
            </div>
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-white/7 pt-4 text-sm text-[color:var(--color-muted)]">
          <span className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            {matchup?.startsAt ? formatNorwayDateTime(matchup.startsAt) : "No start time"}
          </span>
          <span>Updated {formatNorwayDateTime(updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}

function TeamBlock({ name, active = false }: { name: string; active?: boolean }) {
  return (
    <div className="min-w-0 text-center">
      <div
        className={
          active
            ? "mx-auto grid h-[88px] w-[88px] place-items-center rounded-xl border border-[color:var(--accent-soft)] bg-[color:var(--accent-dim)] text-[color:var(--accent)]"
            : "mx-auto grid h-[88px] w-[88px] place-items-center rounded-xl border border-white/10 bg-white/[0.025] text-[color:var(--color-muted)]"
        }
      >
        <Shield className="h-9 w-9" />
      </div>
      <div className="mt-3 truncate font-display text-sm tracking-[0.12em]">
        {name}
      </div>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow">{label}</span>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-[color:var(--accent-dim)] text-[color:var(--accent)]">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-6 font-display text-4xl leading-none tracking-wide">
        {value}
      </div>
      <div className="mt-2 min-h-5 text-sm text-[color:var(--color-muted)]">
        {detail}
      </div>
    </div>
  );
}

function MatchupList({
  title,
  matchups,
  empty,
}: {
  title: string;
  matchups: GGArenaMatchup[];
  empty: string;
}) {
  return (
    <div className="surface p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="eyebrow">{title}</div>
          <div className="mt-1 text-sm text-[color:var(--color-muted)]">
            {matchups.length} returned
          </div>
        </div>
        <CheckCircle2 className="h-5 w-5 text-[color:var(--accent)]" />
      </div>
      {matchups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 px-4 py-8 text-center text-sm text-[color:var(--color-muted)]">
          {empty}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {matchups.map((matchup) => (
            <div
              key={matchup.uuid ?? matchup.id ?? `${matchup.name}-${matchup.startsAt}`}
              className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-white/7 bg-white/[0.02] p-3"
            >
              <div className="min-w-0">
                <div className="truncate font-display text-lg tracking-wide">
                  {matchup.opponentName ?? matchup.name}
                </div>
                <div className="mt-1 truncate text-xs uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
                  {[matchup.competitionName, matchup.divisionName, matchup.roundName]
                    .filter(Boolean)
                    .join(" · ") || "Tournament"}
                </div>
              </div>
              <div className="text-right text-sm text-[color:var(--color-muted)]">
                <div>{matchup.startsAt ? formatNorwayDateTime(matchup.startsAt) : "TBD"}</div>
                <div className="mt-1 uppercase tracking-[0.12em]">
                  {matchup.status ?? "open"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StandingsTable({ rows }: { rows: GGArenaStandingRow[] }) {
  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-white/7 p-5">
        <div>
          <div className="eyebrow">Standings</div>
          <div className="mt-1 text-sm text-[color:var(--color-muted)]">
            Tournament table
          </div>
        </div>
        <Table2 className="h-5 w-5 text-[color:var(--accent)]" />
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-[color:var(--color-muted)]">
          No standings returned.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
              <tr className="border-b border-white/7">
                <th className="px-5 py-3">Division</th>
                <th className="px-3 py-3">Team</th>
                <th className="px-3 py-3 text-right">P</th>
                <th className="px-3 py-3 text-right">W</th>
                <th className="px-3 py-3 text-right">D</th>
                <th className="px-3 py-3 text-right">L</th>
                <th className="px-5 py-3 text-right">Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.scope ?? "table"}-${row.id ?? row.name}-${row.rank ?? ""}`}
                  className={
                    row.isSurfBulls
                      ? "border-b border-white/6 bg-[color:var(--accent-dim)]"
                      : "border-b border-white/6"
                  }
                >
                  <td className="px-5 py-3 text-[color:var(--color-muted)]">
                    {row.scope ?? "Tournament"}
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-display tracking-wide">
                      {row.rank ? `${row.rank}. ` : ""}
                      {row.name}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">{formatNumber(row.played)}</td>
                  <td className="px-3 py-3 text-right">{formatNumber(row.wins)}</td>
                  <td className="px-3 py-3 text-right">{formatNumber(row.draws)}</td>
                  <td className="px-3 py-3 text-right">{formatNumber(row.losses)}</td>
                  <td className="px-5 py-3 text-right font-semibold">{formatNumber(row.points)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatsTable({ rows }: { rows: GGArenaStatRow[] }) {
  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-white/7 p-5">
        <div>
          <div className="eyebrow">Tournament Stats</div>
          <div className="mt-1 text-sm text-[color:var(--color-muted)]">
            GGarena game data
          </div>
        </div>
        <BarChart3 className="h-5 w-5 text-[color:var(--accent)]" />
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-[color:var(--color-muted)]">
          No stat rows returned.
        </div>
      ) : (
        <div className="divide-y divide-white/7">
          {rows.map((row) => (
            <div
              key={`${row.id ?? row.name}-${row.scope ?? ""}`}
              className={row.isSurfBulls ? "bg-[color:var(--accent-dim)] p-4" : "p-4"}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate font-display text-lg tracking-wide">
                    {row.name}
                  </div>
                  {row.scope ? (
                    <div className="mt-1 text-xs uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
                      {row.scope}
                    </div>
                  ) : null}
                </div>
                <div className="grid max-w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {row.metrics.map((metric) => (
                    <div key={metric.key} className="text-right">
                      <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
                        {metric.label}
                      </div>
                      <div className="font-display text-lg">
                        {formatMetric(metric.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatStandingDetail(row: GGArenaStandingRow | null) {
  if (!row) return "Standings pending";
  const parts = [
    row.points === null ? null : `${row.points} pts`,
    row.played === null ? null : `${row.played} played`,
  ].filter(Boolean);
  return parts.join(" · ") || row.name;
}

function formatNumber(value: number | null) {
  return value === null ? "—" : value.toLocaleString();
}

function formatMetric(value: number) {
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
}
