import { notFound } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Shield,
  Table2,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { TeamMark } from "@/components/common/team-mark";
import { TournamentTables } from "@/components/tournaments/tournament-tables";
import { TournamentOptInPanel } from "@/components/tournaments/tournament-opt-in";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatNorwayDateTime } from "@/lib/timezone";
import {
  type GGArenaSnapshot,
  getSurfBullsArenaSnapshot,
} from "@/lib/ggarena/client";
import {
  ACTIVE_TOURNAMENT_OPT_IN_KEY,
  buildTournamentOptInSummary,
  type TournamentOptInSummary,
} from "@/lib/tournaments/opt-in";
import type {
  GGArenaMatchup,
  GGArenaStandingRow,
} from "@/lib/ggarena/normalize";
import type { TournamentOptInRow, UserRow } from "@/types/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tournaments" };

export default async function TournamentsPage() {
  const { user, team } = await requireSession();
  if (team.slug !== "surf-n-bulls") notFound();

  const supabase = await createSupabaseServerClient();
  const [snapshot, { data: members }, { data: optIns }] = await Promise.all([
    getSurfBullsArenaSnapshot(),
    supabase
      .from("users")
      .select("id, display_name, email, avatar_url")
      .eq("team_id", team.id)
      .order("display_name", { ascending: true }),
    supabase
      .from("tournament_opt_ins")
      .select("user_id, status, updated_at")
      .eq("team_id", team.id)
      .eq("tournament_key", ACTIVE_TOURNAMENT_OPT_IN_KEY),
  ]);
  const optInSummary = buildTournamentOptInSummary({
    tournamentKey: ACTIVE_TOURNAMENT_OPT_IN_KEY,
    currentUserId: user.id,
    members: (members ?? []) as Pick<UserRow, "id" | "display_name" | "email" | "avatar_url">[],
    optIns: (optIns ?? []) as Pick<TournamentOptInRow, "user_id" | "status" | "updated_at">[],
  });

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
        <TournamentDashboard snapshot={snapshot} optInSummary={optInSummary} />
      ) : (
        <UnavailableState snapshot={snapshot} />
      )}
    </div>
  );
}

function TournamentDashboard({
  optInSummary,
  snapshot,
}: {
  optInSummary: TournamentOptInSummary;
  snapshot: GGArenaSnapshot;
}) {
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

      <TournamentOptInPanel initialSummary={optInSummary} />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <MatchupList title="Next fixtures" matchups={snapshot.nextMatchups} empty="No upcoming fixtures returned." />
        <MatchupList title="Recent officials" matchups={snapshot.recentMatchups} empty="No recent tournament results returned." />
      </section>

      <TournamentTables standings={snapshot.standings} stats={snapshot.stats} />

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
  const surfSide = matchup?.sides.find((side) => side.isSurfBulls) ?? null;
  const opponentSide = matchup?.sides.find((side) => !side.isSurfBulls) ?? null;

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
            <TeamBlock
              name={surfSide?.name ?? "Surf'n Bulls"}
              logoUrl={surfSide?.logoUrl ?? "/teams/surf-n-bulls-logo.png"}
              active
            />
            <div className="font-display text-4xl tracking-[0.2em] text-[color:var(--color-muted)]">
              VS
            </div>
            <TeamBlock
              name={opponentSide?.name ?? matchup.opponentName ?? "Opponent TBD"}
              logoUrl={opponentSide?.logoUrl}
            />
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

function TeamBlock({
  active = false,
  logoUrl,
  name,
}: {
  active?: boolean;
  logoUrl?: string | null;
  name: string;
}) {
  return (
    <div className="min-w-0 text-center">
      <TeamMark name={name} logoUrl={logoUrl} active={active} size="lg" className="mx-auto" />
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
          {matchups.map((matchup) => {
            const opponentSide = matchup.sides.find((side) => !side.isSurfBulls) ?? null;
            const opponentName = opponentSide?.name ?? matchup.opponentName ?? matchup.name;
            return (
              <div
                key={matchup.uuid ?? matchup.id ?? `${matchup.name}-${matchup.startsAt}`}
                className="grid grid-cols-[auto_1fr_auto] gap-3 rounded-lg border border-white/7 bg-white/[0.02] p-3"
              >
                <TeamMark name={opponentName} logoUrl={opponentSide?.logoUrl} size="sm" />
                <div className="min-w-0">
                  <div className="truncate font-display text-lg tracking-wide">
                    {opponentName}
                  </div>
                  <div className="mt-1 truncate text-xs uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
                    {[matchup.competitionName, matchup.divisionName, matchup.roundName]
                      .filter(Boolean)
                      .join(" · ") || "Tournament"}
                  </div>
                </div>
                <div className="text-right text-sm text-[color:var(--color-muted)]">
                  <div>{matchup.startsAt ? formatNorwayDateTime(matchup.startsAt) : "TBD"}</div>
                  <MatchupResult matchup={matchup} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MatchupResult({ matchup }: { matchup: GGArenaMatchup }) {
  if (!matchup.surfResult) {
    return (
      <div className="mt-1 uppercase tracking-[0.12em]">
        {matchup.status ?? "open"}
      </div>
    );
  }

  const variant =
    matchup.surfResult === "win"
      ? "success"
      : matchup.surfResult === "loss"
        ? "danger"
        : "warning";

  return (
    <div className="mt-1 flex justify-end gap-2">
      <Badge variant={variant}>{formatMatchupResult(matchup.surfResult)}</Badge>
      {matchup.scoreline ? <Badge variant="outline">{matchup.scoreline}</Badge> : null}
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

function formatMatchupResult(result: NonNullable<GGArenaMatchup["surfResult"]>) {
  if (result === "win") return "W";
  if (result === "loss") return "L";
  return "D";
}
