"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ClipboardCheck,
  ShieldCheck,
  StickyNote,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TeamMark } from "@/components/common/team-mark";
import { matchupDomId } from "@/lib/ggarena/matchup-links";
import { formatNorwayDateTime } from "@/lib/timezone";
import type { GGArenaMatchup, GGArenaStandingRow } from "@/lib/ggarena/normalize";
import type { TournamentOptInSummary } from "@/lib/tournaments/opt-in";
import type {
  TournamentMatchPrepChecklistItem,
  TournamentMatchPrepSummary,
} from "@/lib/tournaments/match-prep";
import { initials } from "@/lib/utils";

interface Props {
  canManage: boolean;
  currentUserId: string;
  matchup: GGArenaMatchup;
  optInSummary: TournamentOptInSummary;
  standings: GGArenaStandingRow[];
  initialSummary: TournamentMatchPrepSummary;
}

export function TournamentMatchPrep({
  canManage,
  currentUserId,
  initialSummary,
  matchup,
  optInSummary,
  standings,
}: Props) {
  const [summary, setSummary] = useState(initialSummary);
  const [notes, setNotes] = useState(initialSummary.notes);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const opponentSide = matchup.sides.find((side) => !side.isSurfBulls) ?? null;
  const opponentName = opponentSide?.name ?? matchup.opponentName ?? matchup.name;
  const opponentStanding = findStandingForOpponent(standings, matchup, opponentName);
  const surfStanding = standings.find((row) => row.isSurfBulls) ?? null;
  const currentRosterMember = optInSummary.activeRoster.find(
    (member) => member.userId === currentUserId,
  );
  const currentReady =
    currentRosterMember ? summary.readyByUserId[currentRosterMember.userId]?.ready ?? false : false;

  async function saveNotes() {
    await postPrepUpdate("notes", {
      action: "notes",
      matchup_key: summary.matchupKey,
      notes,
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
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="eyebrow">Opponent</div>
                <div className="mt-1 font-display text-xl tracking-wide">{opponentName}</div>
              </div>
              <TeamMark name={opponentName} logoUrl={opponentSide?.logoUrl} size="sm" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <StandingStat label="Their rank" value={formatStandingRank(opponentStanding)} />
              <StandingStat label="Their record" value={formatStandingRecord(opponentStanding)} />
              <StandingStat label="Our rank" value={formatStandingRank(surfStanding)} />
              <StandingStat label="Our record" value={formatStandingRecord(surfStanding)} />
            </div>
            <Link
              href={`/tournaments?match=${encodeURIComponent(summary.matchupKey)}#${matchupDomId(matchup)}`}
              className="mt-4 inline-flex text-sm text-[color:var(--accent)] hover:underline"
            >
              Open GGarena match row
            </Link>
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

function findStandingForOpponent(
  standings: GGArenaStandingRow[],
  matchup: GGArenaMatchup,
  opponentName: string,
) {
  const opponentSide = matchup.sides.find((side) => !side.isSurfBulls) ?? null;
  const candidateIds = new Set(
    [opponentSide?.teamId, opponentSide?.clubId, opponentSide?.id].filter(
      (id): id is number => typeof id === "number",
    ),
  );
  const normalizedOpponent = normalizeName(opponentName);

  return (
    standings.find((row) => row.id !== null && candidateIds.has(row.id)) ??
    standings.find((row) => normalizeName(row.name) === normalizedOpponent) ??
    null
  );
}

function formatStandingRank(row: GGArenaStandingRow | null) {
  if (!row?.rank) return "Pending";
  return `#${row.rank}${row.points === null ? "" : ` · ${row.points} pts`}`;
}

function formatStandingRecord(row: GGArenaStandingRow | null) {
  if (!row) return "Pending";
  const parts = [
    row.wins === null ? null : `${row.wins}W`,
    row.draws === null ? null : `${row.draws}D`,
    row.losses === null ? null : `${row.losses}L`,
  ].filter(Boolean);
  return parts.join(" ") || (row.played === null ? "Pending" : `${row.played} played`);
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
