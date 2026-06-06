"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Crosshair,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Swords,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TeamMark } from "@/components/common/team-mark";
import { matchupDomId } from "@/lib/ggarena/matchup-links";
import { formatNorwayDateTime } from "@/lib/timezone";
import type { GGArenaMatchup } from "@/lib/ggarena/normalize";
import type { TournamentOptInSummary } from "@/lib/tournaments/opt-in";
import type { TournamentOpponentScoutSummary } from "@/lib/tournaments/opponent-scouting";
import {
  buildSuggestedAgentComp,
  type AgentCompSuggestion,
  type PlayerAgentPoolSummary,
} from "@/lib/valorant/agent-pool";
import { getAgentIcon } from "@/lib/valorant/assets";
import type {
  TournamentMatchPrepChecklistItem,
  TournamentMatchPrepSummary,
} from "@/lib/tournaments/match-prep";
import { initials } from "@/lib/utils";

interface Props {
  agentPools: PlayerAgentPoolSummary[];
  canManage: boolean;
  currentUserId: string;
  matchup: GGArenaMatchup;
  optInSummary: TournamentOptInSummary;
  initialSummary: TournamentMatchPrepSummary;
  opponentScout: TournamentOpponentScoutSummary;
}

export function TournamentMatchPrep({
  canManage,
  currentUserId,
  agentPools,
  initialSummary,
  matchup,
  optInSummary,
  opponentScout,
}: Props) {
  const [summary, setSummary] = useState(initialSummary);
  const [notes, setNotes] = useState(initialSummary.notes);
  const [scoutOpen, setScoutOpen] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const opponentSide = matchup.sides.find((side) => !side.isSurfBulls) ?? null;
  const opponentName = opponentSide?.name ?? matchup.opponentName ?? matchup.name;
  const opponentStanding = opponentScout.standing;
  const currentRosterMember = optInSummary.activeRoster.find(
    (member) => member.userId === currentUserId,
  );
  const currentReady =
    currentRosterMember ? summary.readyByUserId[currentRosterMember.userId]?.ready ?? false : false;
  const compSuggestion = buildSuggestedAgentComp({
    agentPools,
    roster: optInSummary.activeRoster,
  });

  async function saveNotes() {
    await postPrepUpdate("notes", {
      action: "notes",
      matchup_key: summary.matchupKey,
      division_name: matchup.divisionName ?? matchup.competitionName ?? null,
      matchup_starts_at: matchup.startsAt,
      notes,
      opponent_name: opponentName,
    });
  }

  async function toggleReady(userId: string, ready: boolean) {
    await postPrepUpdate(`ready:${userId}`, {
      action: "ready",
      matchup_key: summary.matchupKey,
      ready,
      user_id: userId,
    });
  }

  async function toggleChecklist(item: TournamentMatchPrepChecklistItem) {
    await postPrepUpdate(`check:${item.id}`, {
      action: "checklist",
      matchup_key: summary.matchupKey,
      checked: !item.checked,
      item_id: item.id,
    });
  }

  async function postPrepUpdate(key: string, payload: Record<string, unknown>) {
    setBusyKey(key);
    setError(null);
    try {
      const response = await fetch("/api/tournaments/match-prep", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json().catch(() => ({}))) as {
        data?: TournamentMatchPrepSummary;
        error?: string;
      };
      if (!response.ok || !body.data) {
        throw new Error(body.error ?? "Could not update match prep.");
      }
      setSummary(body.data);
      setNotes(body.data.notes);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update match prep.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section id="match-prep" className="surface overflow-hidden">
      <div className="border-b border-white/7 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="eyebrow inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[color:var(--accent)]" />
              Match prep
            </div>
            <h2 className="mt-1 font-display text-2xl tracking-wide">
              Surf&apos;n Bulls vs {opponentName}
            </h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
              <span>{matchup.startsAt ? formatNorwayDateTime(matchup.startsAt) : "Time TBD"}</span>
              <span>{matchup.divisionName ?? matchup.competitionName ?? "GGarena"}</span>
              {matchup.roundName ? <span>{matchup.roundName}</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={summary.allReady ? "success" : "warning"}>
              {summary.readyCount}/{summary.rosterCount} ready
            </Badge>
            <Badge variant={summary.checklistDoneCount === summary.checklistTotalCount ? "success" : "outline"}>
              {summary.checklistDoneCount}/{summary.checklistTotalCount} checklist
            </Badge>
          </div>
        </div>
        {error ? (
          <div className="mt-3 rounded-lg border border-red-400/20 bg-red-400/8 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-5 p-5 xl:grid-cols-[1fr_1fr]">
        <div className="grid gap-5">
          <section className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
            <button
              type="button"
              aria-expanded={scoutOpen}
              onClick={() => setScoutOpen((open) => !open)}
              className="mb-4 flex w-full items-center justify-between gap-3 rounded-lg border border-transparent p-0 text-left transition hover:border-white/8 hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
            >
              <span className="flex min-w-0 items-center gap-3">
                <TeamMark name={opponentName} logoUrl={opponentSide?.logoUrl} size="sm" />
                <span className="min-w-0">
                  <span className="eyebrow block">Opponent</span>
                  <span className="mt-1 block truncate font-display text-xl tracking-wide">
                    {opponentName}
                  </span>
                </span>
              </span>
              <ChevronDown
                className={
                  scoutOpen
                    ? "h-4 w-4 shrink-0 rotate-180 text-[color:var(--accent)] transition"
                    : "h-4 w-4 shrink-0 text-[color:var(--color-muted)] transition"
                }
              />
            </button>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <StandingStat label="Their rank" value={formatStandingRank(opponentStanding)} />
              <StandingStat label="Their record" value={formatStandingRecord(opponentStanding)} />
              <StandingStat label="Recent results" value={String(opponentScout.recentResults.length)} />
              <StandingStat label="Roster rows" value={String(opponentScout.roster.length)} />
            </div>
            <Link
              href={`/tournaments?match=${encodeURIComponent(summary.matchupKey)}#${matchupDomId(matchup)}`}
              className="mt-4 inline-flex text-sm text-[color:var(--accent)] hover:underline"
            >
              Open GGarena match row
            </Link>
            {scoutOpen ? <OpponentScoutPanel scout={opponentScout} /> : null}
          </section>

          <section className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="eyebrow inline-flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-[color:var(--accent)]" />
                  Map notes
                </div>
                <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                  Coach/admin notes for anti-strat, pistol focus, and map plan.
                </p>
              </div>
            </div>
            <Textarea
              disabled={!canManage || busyKey === "notes"}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Example: If Haven, deny garage early and keep retake utility for C."
              value={notes}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-[color:var(--color-muted)]">
                {summary.notesUpdatedAt ? `Updated ${formatNorwayDateTime(summary.notesUpdatedAt)}` : "No notes saved yet"}
              </span>
              {canManage ? (
                <Button disabled={busyKey === "notes"} onClick={saveNotes} size="sm" type="button">
                  Save notes
                </Button>
              ) : null}
            </div>
          </section>
        </div>

        <div className="grid gap-5">
          <section className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="eyebrow inline-flex items-center gap-2">
                  <Users className="h-4 w-4 text-[color:var(--accent)]" />
                  Locked roster
                </div>
                <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                  Roles and ready state for the current tournament five.
                </p>
              </div>
              {currentRosterMember ? (
                <Button
                  disabled={busyKey === `ready:${currentRosterMember.userId}`}
                  onClick={() => toggleReady(currentRosterMember.userId, !currentReady)}
                  size="sm"
                  type="button"
                  variant={currentReady ? "outline" : "accent"}
                >
                  {currentReady ? "Mark not ready" : "I am ready"}
                </Button>
              ) : null}
            </div>
            <div className="grid gap-2">
              {optInSummary.activeRoster.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-sm text-[color:var(--color-muted)]">
                  Nobody is locked yet.
                </div>
              ) : (
                optInSummary.activeRoster.map((member) => (
                  <RosterReadyRow
                    key={member.userId}
                    canManage={canManage}
                    busy={busyKey === `ready:${member.userId}`}
                    member={member}
                    ready={summary.readyByUserId[member.userId]?.ready ?? false}
                    onToggle={(ready) => toggleReady(member.userId, ready)}
                  />
                ))
              )}
            </div>

            {optInSummary.waitlist.length > 0 ? (
              <div className="mt-4 border-t border-white/7 pt-4">
                <div className="mb-2 text-xs uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                  Waitlist
                </div>
                <div className="flex flex-wrap gap-2">
                  {optInSummary.waitlist.map((member) => (
                    <span
                      key={member.userId}
                      className="rounded-lg border border-white/8 bg-white/[0.025] px-2.5 py-1.5 text-xs"
                    >
                      #{member.waitlistPosition} {member.displayName}
                      {member.preferredRole ? ` · ${member.preferredRole}` : ""}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <AgentCompPanel suggestion={compSuggestion} />

          <section className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
            <div className="mb-3">
              <div className="eyebrow inline-flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-[color:var(--accent)]" />
                Match-day checklist
              </div>
              <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                Coach/admin checklist for this GGarena match.
              </p>
            </div>
            <div className="grid gap-2">
              {summary.checklist.map((item) => (
                <button
                  key={item.id}
                  disabled={!canManage || busyKey === `check:${item.id}`}
                  onClick={() => toggleChecklist(item)}
                  type="button"
                  className={
                    item.checked
                      ? "flex items-start gap-3 rounded-lg border border-[color:var(--accent-soft)] bg-[color:var(--accent-dim)] p-3 text-left"
                      : "flex items-start gap-3 rounded-lg border border-white/8 bg-white/[0.02] p-3 text-left transition hover:border-[color:var(--accent-soft)] disabled:hover:border-white/8"
                  }
                >
                  <CheckCircle2
                    className={
                      item.checked
                        ? "mt-0.5 h-4 w-4 shrink-0 text-[color:var(--accent)]"
                        : "mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-muted)]"
                    }
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-[color:var(--color-muted)]">
                      {item.detail}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function OpponentScoutPanel({ scout }: { scout: TournamentOpponentScoutSummary }) {
  return (
    <div className="mt-4 grid gap-3 border-t border-white/8 pt-4">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
          <Swords className="h-4 w-4 text-[color:var(--accent)]" />
          Recent results
        </div>
        {scout.recentResults.length === 0 ? (
          <EmptyScoutRow>No recent opponent results returned.</EmptyScoutRow>
        ) : (
          <div className="grid gap-2">
            {scout.recentResults.map((result) => (
              <div
                key={result.key}
                className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold">
                    vs {result.otherTeamName}
                  </div>
                  <div className="mt-1 truncate text-xs uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
                    {[result.divisionName, result.roundName].filter(Boolean).join(" · ") || "GGarena"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex justify-end gap-1.5">
                    {result.result ? (
                      <Badge variant={result.result === "win" ? "success" : result.result === "loss" ? "danger" : "warning"}>
                        {formatScoutResult(result.result)}
                      </Badge>
                    ) : null}
                    {result.scoreline ? <Badge variant="outline">{result.scoreline}</Badge> : null}
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--color-muted)]">
                    {result.playedAt ? formatNorwayDateTime(result.playedAt) : "Date missing"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
          <Crosshair className="h-4 w-4 text-[color:var(--accent)]" />
          Roster
        </div>
        {scout.roster.length === 0 ? (
          <EmptyScoutRow>No roster stats returned for this opponent.</EmptyScoutRow>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {scout.roster.map((player) => (
              <div
                key={player.key}
                className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2"
              >
                <div className="truncate font-semibold">{player.name}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {player.metrics.map((metric) => (
                    <span
                      key={`${player.key}-${metric.key}`}
                      className="rounded-full border border-white/8 bg-black/15 px-2 py-1 text-[11px] text-[color:var(--color-muted)]"
                    >
                      {shortMetricLabel(metric.label)} {formatMetricValue(metric.value)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
          <BookOpen className="h-4 w-4 text-[color:var(--accent)]" />
          Previous notes
        </div>
        {scout.previousNotes.length === 0 ? (
          <EmptyScoutRow>No previous prep notes saved for this opponent.</EmptyScoutRow>
        ) : (
          <div className="grid gap-2">
            {scout.previousNotes.map((note) => (
              <article
                key={`${note.key}-${note.updatedAt}`}
                className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
                  <span>{note.playedAt ? formatNorwayDateTime(note.playedAt) : note.matchupName}</span>
                  <span>Updated {formatNorwayDateTime(note.updatedAt)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap leading-5 text-[color:var(--color-text)]">
                  {note.notes}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyScoutRow({ children }: { children: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-sm text-[color:var(--color-muted)]">
      {children}
    </div>
  );
}

function AgentCompPanel({ suggestion }: { suggestion: AgentCompSuggestion }) {
  return (
    <section className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="eyebrow inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[color:var(--accent)]" />
            Suggested comp
          </div>
          <p className="mt-1 text-sm text-[color:var(--color-muted)]">
            Built from the locked roster and each player&apos;s saved agent pool.
          </p>
        </div>
        <Badge variant={suggestion.warnings.length === 0 ? "success" : "warning"}>
          {suggestion.warnings.length === 0 ? "Playable" : `${suggestion.warnings.length} checks`}
        </Badge>
      </div>

      {suggestion.assignments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-sm text-[color:var(--color-muted)]">
          Lock five players before picking a comp.
        </div>
      ) : (
        <div className="grid gap-2">
          {suggestion.assignments.map((assignment) => (
            <div
              key={assignment.userId}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2"
            >
              <AgentThumb agent={assignment.agent} />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{assignment.displayName}</div>
                <div className="mt-0.5 text-xs uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
                  {assignment.assignedRole ?? "No role"}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-lg tracking-wide">
                  {assignment.agent ?? "No agent"}
                </div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
                  {assignment.poolSize > 0 ? `${assignment.poolSize} saved` : "Pool empty"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {suggestion.warnings.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestion.warnings.map((warning) => (
            <span
              key={warning}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-100"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {warning}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function AgentThumb({ agent }: { agent: string | null }) {
  const icon = getAgentIcon(agent);
  if (!agent || !icon) {
    return (
      <div className="grid h-10 w-10 place-items-center rounded-lg border border-white/8 bg-white/[0.04] text-xs text-[color:var(--color-muted)]">
        ??
      </div>
    );
  }

  return (
    <Image
      src={icon}
      alt=""
      width={40}
      height={40}
      className="h-10 w-10 rounded-lg border border-white/8 bg-white/[0.04] object-contain"
    />
  );
}

function RosterReadyRow({
  busy,
  canManage,
  member,
  onToggle,
  ready,
}: {
  busy: boolean;
  canManage: boolean;
  member: TournamentOptInSummary["activeRoster"][number];
  onToggle: (ready: boolean) => void;
  ready: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-semibold">
          {initials(member.displayName)}
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold">{member.displayName}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {member.preferredRole ? <Badge>{member.preferredRole}</Badge> : <Badge variant="warning">No role</Badge>}
            {member.secondaryRoles.slice(0, 2).map((role) => (
              <Badge key={role} variant="outline">
                {role}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={ready ? "success" : "outline"}>{ready ? "Ready" : "Not ready"}</Badge>
        {canManage ? (
          <Button
            disabled={busy}
            onClick={() => onToggle(!ready)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {ready ? "Unset" : "Set ready"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function StandingStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-black/15 px-3 py-2">
      <div className="text-[0.65rem] uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
        {label}
      </div>
      <div className="mt-1 font-display text-lg tracking-wide">{value}</div>
    </div>
  );
}

function formatStandingRank(row: TournamentOpponentScoutSummary["standing"]) {
  if (!row?.rank) return "Pending";
  return `#${row.rank}${row.points === null ? "" : ` · ${row.points} pts`}`;
}

function formatStandingRecord(row: TournamentOpponentScoutSummary["standing"]) {
  if (!row) return "Pending";
  const parts = [
    row.wins === null ? null : `${row.wins}W`,
    row.draws === null ? null : `${row.draws}D`,
    row.losses === null ? null : `${row.losses}L`,
  ].filter(Boolean);
  return parts.join(" ") || (row.played === null ? "Pending" : `${row.played} played`);
}

function formatScoutResult(result: "win" | "loss" | "draw") {
  if (result === "win") return "W";
  if (result === "loss") return "L";
  return "D";
}

function shortMetricLabel(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("assist")) return "A";
  if (normalized.includes("death")) return "D";
  if (normalized.includes("headshot")) return "HS";
  if (normalized.includes("kill")) return "K";
  if (normalized.includes("combat")) return "ACS";
  return label;
}

function formatMetricValue(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}
