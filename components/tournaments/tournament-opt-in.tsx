"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCircle2, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { roleLabel } from "@/lib/valorant/roles";
import { cn, initials } from "@/lib/utils";
import {
  TOURNAMENT_OPT_IN_OBJECT_TYPE,
  TOURNAMENT_OPT_IN_VERBS,
} from "@/lib/tournaments/opt-in";
import type {
  TournamentOptInIntent,
  TournamentOptInStatus,
  TournamentOptInSummary,
} from "@/lib/tournaments/opt-in";
import type { ActivityEventRow } from "@/types/domain";

const SUMMARY_EVENT = "nexus:tournament-opt-in-summary";

interface OptInNotice {
  id: string;
  title: string;
  body: string;
  tone: "success" | "danger" | "warning";
}

export function TournamentOptInTopbar({
  currentUserId,
  initialSummary,
  teamId,
}: {
  currentUserId: string;
  initialSummary: TournamentOptInSummary;
  teamId: string;
}) {
  const { busyStatus, error, notice, setNotice, summary, updateStatus } = useTournamentOptIn(
    initialSummary,
    { currentUserId, realtime: true, teamId },
  );
  const currentIsIn =
    summary.currentUserStatus === "active" || summary.currentUserStatus === "waitlist";

  return (
    <>
      {notice ? <OptInNoticeToast notice={notice} onDismiss={() => setNotice(null)} /> : null}
      <div className="hidden items-center gap-1 rounded-[1rem] border border-white/10 bg-white/[0.025] p-1 lg:flex">
        <OptInButton
          active={currentIsIn}
          busy={busyStatus === "in"}
          disabled={busyStatus !== null}
          label={formatOptInActionLabel(summary)}
          status="in"
          onClick={updateStatus}
        />
        <OptInButton
          active={summary.currentUserStatus === "out"}
          busy={busyStatus === "out"}
          disabled={busyStatus !== null}
          label="OUT"
          status="out"
          onClick={updateStatus}
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Notifications"
          className="relative grid h-12 w-12 place-items-center rounded-[1rem] border border-white/10 bg-white/[0.025] text-[color:var(--color-muted)] transition hover:border-[color:var(--accent-soft)] hover:text-[color:var(--accent)]"
        >
          <Bell className="h-[18px] w-[18px]" />
          {summary.optedInCount > 0 ? (
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[color:var(--accent)] shadow-[0_0_10px_var(--accent)]" />
          ) : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[21rem] p-0">
          <div className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DropdownMenuLabel className="px-0 py-0">Tournament opt-in</DropdownMenuLabel>
                <div className="mt-1 text-sm text-[color:var(--color-muted)]">
                  {formatSummaryCounts(summary)}
                </div>
              </div>
              <StatusBadge status={summary.currentUserStatus} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 lg:hidden">
              <OptInButton
                active={currentIsIn}
                busy={busyStatus === "in"}
                disabled={busyStatus !== null}
                label={formatOptInActionLabel(summary)}
                status="in"
                onClick={updateStatus}
              />
              <OptInButton
                active={summary.currentUserStatus === "out"}
                busy={busyStatus === "out"}
                disabled={busyStatus !== null}
                label="OUT"
                status="out"
                onClick={updateStatus}
              />
            </div>
            {error ? <div className="mt-2 text-xs text-red-300">{error}</div> : null}
          </div>
          <DropdownMenuSeparator className="m-0" />
          <div className="max-h-72 overflow-y-auto p-2">
            {[...summary.activeRoster, ...summary.waitlist].map((member) => (
              <RosterStatusRow key={member.userId} member={member} compact />
            ))}
            {summary.optedInCount === 0 ? (
              <div className="px-2 py-4 text-sm text-[color:var(--color-muted)]">
                Nobody has opted in yet.
              </div>
            ) : null}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export function TournamentOptInPanel({
  canManage = false,
  initialSummary,
}: {
  canManage?: boolean;
  initialSummary: TournamentOptInSummary;
}) {
  const {
    busyAction,
    busyStatus,
    completeTournament,
    error,
    promoteWaitlistedPlayer,
    summary,
    updateStatus,
  } = useTournamentOptIn(initialSummary);
  const currentIsIn =
    summary.currentUserStatus === "active" || summary.currentUserStatus === "waitlist";
  const outMembers = summary.members.filter((member) => member.status === "out");
  const pendingMembers = summary.members.filter((member) => member.status === null);

  return (
    <section className="surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow">Availability</div>
          <h2 className="mt-1 font-display text-2xl tracking-wide">
            Tournament opt-in
          </h2>
          <p className="mt-1 text-sm text-[color:var(--color-muted)]">
            {formatSummaryCounts(summary)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OptInButton
            active={currentIsIn}
            busy={busyStatus === "in"}
            disabled={busyStatus !== null}
            label={formatOptInActionLabel(summary)}
            status="in"
            onClick={updateStatus}
          />
          <OptInButton
            active={summary.currentUserStatus === "out"}
            busy={busyStatus === "out"}
            disabled={busyStatus !== null}
            label="OPT OUT"
            status="out"
            onClick={updateStatus}
          />
        </div>
      </div>

      {error ? <div className="mt-3 text-sm text-red-300">{error}</div> : null}

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-white/7 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">Roster lock</div>
            <CurrentUserBadge
              status={summary.currentUserStatus}
              waitlistPosition={summary.currentUserWaitlistPosition}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <CountTile label="Locked" value={`${summary.activeCount}/${summary.rosterLimit}`} variant="success" />
            <CountTile label="Waitlist" value={summary.waitlistCount} variant="pending" />
            <CountTile label="Pending" value={summary.pendingCount} variant="pending" />
            <CountTile label="Out" value={summary.optedOutCount} variant="danger" />
          </div>
          <div className="mt-4 space-y-2">
            {summary.roleWarnings.length > 0 ? (
              summary.roleWarnings.map((warning) => (
                <Badge key={warning} variant="warning">
                  {warning}
                </Badge>
              ))
            ) : (
              <Badge variant="success">Role balance looks playable</Badge>
            )}
          </div>
          {canManage ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-4 w-full justify-center"
              disabled={
                busyAction === "complete" ||
                (summary.activeCount === 0 &&
                  summary.waitlistCount === 0 &&
                  summary.optedOutCount === 0)
              }
              onClick={completeTournament}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {busyAction === "complete" ? "Resetting" : "Mark tournament done"}
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3">
          <RosterSection
            title="Locked roster"
            count={summary.activeRoster.length}
            empty="No locked players yet."
          >
            {summary.activeRoster.map((member) => (
              <RosterStatusRow key={member.userId} member={member} />
            ))}
          </RosterSection>

          <RosterSection
            title="Waitlist"
            count={summary.waitlist.length}
            empty="Waitlist is empty."
          >
            {summary.waitlist.map((member) => (
              <WaitlistStatusRow
                key={member.userId}
                activeRoster={summary.activeRoster}
                busy={busyAction === `promote:${member.userId}`}
                canManage={canManage}
                member={member}
                rosterFull={summary.activeCount >= summary.rosterLimit}
                onPromote={promoteWaitlistedPlayer}
              />
            ))}
          </RosterSection>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <RosterSection title="Pending" count={pendingMembers.length} empty="Nobody pending." layout="single">
              {pendingMembers.map((member) => (
                <RosterStatusRow key={member.userId} member={member} />
              ))}
            </RosterSection>
            <RosterSection title="Out" count={outMembers.length} empty="Nobody opted out." layout="single">
              {outMembers.map((member) => (
                <RosterStatusRow key={member.userId} member={member} />
              ))}
            </RosterSection>
          </div>
        </div>
      </div>
    </section>
  );
}

function useTournamentOptIn(
  initialSummary: TournamentOptInSummary,
  options: {
    currentUserId?: string;
    realtime?: boolean;
    teamId?: string;
  } = {},
) {
  const [summary, setSummary] = useState(initialSummary);
  const [busyStatus, setBusyStatus] = useState<TournamentOptInIntent | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<OptInNotice | null>(null);
  const summaryRef = useRef(summary);
  const seenEventsRef = useRef(new Set<string>());

  useEffect(() => {
    summaryRef.current = summary;
  }, [summary]);

  useEffect(() => {
    function sync(event: Event) {
      const detail = (event as CustomEvent<TournamentOptInSummary>).detail;
      if (detail?.tournamentKey === summary.tournamentKey) {
        setSummary(detail);
      }
    }

    window.addEventListener(SUMMARY_EVENT, sync);
    return () => window.removeEventListener(SUMMARY_EVENT, sync);
  }, [summary.tournamentKey]);

  useEffect(() => {
    if (!options.realtime || !options.teamId) return;

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`tournament-opt-in:${options.teamId}:${initialSummary.tournamentKey}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_events",
          filter: `team_id=eq.${options.teamId}`,
        },
        async (payload) => {
          const row = payload.new as ActivityEventRow;
          const currentSummary = summaryRef.current;
          if (!isTournamentOptInActivity(row, currentSummary.tournamentKey)) return;

          const eventKey = row.id || `${row.actor_id}:${row.verb}:${row.created_at}`;
          if (seenEventsRef.current.has(eventKey)) return;
          seenEventsRef.current.add(eventKey);

          try {
            const next = await fetchTournamentOptInSummary(currentSummary.tournamentKey);
            setSummary(next);
            window.dispatchEvent(new CustomEvent(SUMMARY_EVENT, { detail: next }));

            const nextNotice = buildOptInNotice(row, next, options.currentUserId);
            if (nextNotice) setNotice(nextNotice);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not refresh opt-in status");
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [initialSummary.tournamentKey, options.currentUserId, options.realtime, options.teamId]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5_000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function updateStatus(status: TournamentOptInIntent) {
    if (
      (status === "in" &&
        (summary.currentUserStatus === "active" || summary.currentUserStatus === "waitlist")) ||
      (status === "out" && summary.currentUserStatus === "out")
    ) {
      return;
    }

    setBusyStatus(status);
    setError(null);
    try {
      const next = await postTournamentOptIn({
        tournament_key: summary.tournamentKey,
        status,
      });
      setSummary(next);
      window.dispatchEvent(new CustomEvent(SUMMARY_EVENT, { detail: next }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save opt-in status");
    } finally {
      setBusyStatus(null);
    }
  }

  async function promoteWaitlistedPlayer(userId: string, replaceUserId: string | null) {
    setBusyAction(`promote:${userId}`);
    setError(null);
    try {
      const next = await postTournamentOptIn({
        tournament_key: summary.tournamentKey,
        action: "promote",
        user_id: userId,
        replace_user_id: replaceUserId ?? undefined,
      });
      setSummary(next);
      window.dispatchEvent(new CustomEvent(SUMMARY_EVENT, { detail: next }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not promote waitlisted player");
    } finally {
      setBusyAction(null);
    }
  }

  async function completeTournament() {
    setBusyAction("complete");
    setError(null);
    try {
      const next = await postTournamentOptIn({
        tournament_key: summary.tournamentKey,
        action: "complete",
      });
      setSummary(next);
      window.dispatchEvent(new CustomEvent(SUMMARY_EVENT, { detail: next }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset tournament roster");
    } finally {
      setBusyAction(null);
    }
  }

  return {
    busyAction,
    busyStatus,
    completeTournament,
    error,
    notice,
    promoteWaitlistedPlayer,
    setNotice,
    summary,
    updateStatus,
  };
}

async function fetchTournamentOptInSummary(tournamentKey: string) {
  const url = new URL("/api/tournaments/opt-in", window.location.origin);
  url.searchParams.set("tournament_key", tournamentKey);
  const response = await fetch(url.toString(), { method: "GET" });
  const payload = (await response.json()) as {
    data?: TournamentOptInSummary;
    error?: string;
  };
  if (!response.ok || !payload.data) {
    throw new Error(payload.error ?? "Could not refresh tournament status");
  }
  return payload.data;
}

async function postTournamentOptIn(body: Record<string, unknown>) {
  const response = await fetch("/api/tournaments/opt-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as {
    data?: TournamentOptInSummary;
    error?: string;
  };
  if (!response.ok || !payload.data) {
    throw new Error(payload.error ?? "Could not save tournament status");
  }
  return payload.data;
}

function isTournamentOptInActivity(row: ActivityEventRow, tournamentKey: string) {
  return (
    row.object_type === TOURNAMENT_OPT_IN_OBJECT_TYPE &&
    row.object_id === tournamentKey &&
    TOURNAMENT_OPT_IN_VERBS.includes(row.verb as (typeof TOURNAMENT_OPT_IN_VERBS)[number])
  );
}

function buildOptInNotice(
  row: ActivityEventRow,
  summary: TournamentOptInSummary,
  currentUserId?: string,
): OptInNotice | null {
  if (row.actor_id && row.actor_id === currentUserId) return null;
  if (row.verb === "tournament_completed") {
    return {
      id: row.id,
      title: "Tournament completed",
      body: "Roster opt-ins were reset to pending.",
      tone: "warning",
    };
  }
  if (row.verb !== "tournament_opted_in" && row.verb !== "tournament_opted_out") return null;

  const member = row.actor_id
    ? summary.members.find((item) => item.userId === row.actor_id)
    : null;
  const name = member?.displayName ?? "A player";

  if (row.verb === "tournament_opted_out") {
    return {
      id: row.id,
      title: "Tournament opt-out",
      body: `${name} opted out.`,
      tone: "danger",
    };
  }

  const statusCopy =
    member?.status === "active"
      ? "and locked a roster spot"
      : member?.status === "waitlist"
        ? `and joined waitlist #${member.waitlistPosition ?? "-"}`
        : "for the tournament";
  const rosterJustLocked =
    member?.status === "active" && summary.activeCount >= summary.rosterLimit;

  return {
    id: row.id,
    title: rosterJustLocked ? "Roster locked" : "Tournament opt-in",
    body: rosterJustLocked
      ? `${name} opted in and locked the roster at ${summary.activeCount}/${summary.rosterLimit}.`
      : `${name} opted in ${statusCopy}.`,
    tone: member?.status === "waitlist" ? "warning" : "success",
  };
}

function OptInNoticeToast({
  notice,
  onDismiss,
}: {
  notice: OptInNotice;
  onDismiss: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "fixed right-5 top-[5.25rem] z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border bg-[#0b0f16]/95 p-4 text-left shadow-[0_18px_50px_rgba(0,0,0,0.38)] backdrop-blur-xl transition hover:border-white/18",
        notice.tone === "success" && "border-green-500/30",
        notice.tone === "danger" && "border-red-500/30",
        notice.tone === "warning" && "border-amber-500/30",
      )}
      onClick={onDismiss}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-1 h-2.5 w-2.5 rounded-full",
            notice.tone === "success" && "bg-green-400",
            notice.tone === "danger" && "bg-red-400",
            notice.tone === "warning" && "bg-amber-400",
          )}
        />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[color:var(--color-text)]">
            {notice.title}
          </span>
          <span className="mt-1 block text-sm text-[color:var(--color-muted)]">
            {notice.body}
          </span>
        </span>
      </div>
    </button>
  );
}

function OptInButton({
  active,
  busy,
  disabled,
  label,
  status,
  onClick,
}: {
  active: boolean;
  busy: boolean;
  disabled: boolean;
  label: string;
  status: TournamentOptInIntent;
  onClick: (status: TournamentOptInIntent) => void;
}) {
  const isIn = status === "in";
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? (isIn ? "accent" : "danger") : "subtle"}
      className={active || !isIn ? undefined : "text-[color:var(--accent)]"}
      disabled={disabled}
      onClick={() => onClick(status)}
    >
      {isIn ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {busy ? "Saving" : label}
    </Button>
  );
}

function RosterSection({
  children,
  count,
  empty,
  layout = "auto",
  title,
}: {
  children: React.ReactNode;
  count: number;
  empty: string;
  layout?: "auto" | "single";
  title: string;
}) {
  return (
    <div className="rounded-lg border border-white/7 bg-white/[0.02] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">{title}</div>
        <Badge variant="outline">{count}</Badge>
      </div>
      <div
        className={cn(
          "grid grid-cols-1 gap-2",
          layout === "auto" ? "sm:grid-cols-2" : null,
        )}
      >
        {count > 0 ? children : (
          <div className="col-span-full rounded-lg border border-dashed border-white/10 px-3 py-4 text-sm text-[color:var(--color-muted)]">
            {empty}
          </div>
        )}
      </div>
    </div>
  );
}

function WaitlistStatusRow({
  activeRoster,
  busy,
  canManage,
  member,
  onPromote,
  rosterFull,
}: {
  activeRoster: TournamentOptInSummary["activeRoster"];
  busy: boolean;
  canManage: boolean;
  member: TournamentOptInSummary["waitlist"][number];
  onPromote: (userId: string, replaceUserId: string | null) => void;
  rosterFull: boolean;
}) {
  const [replaceUserId, setReplaceUserId] = useState("");

  return (
    <div className="rounded-lg border border-white/7 bg-black/10 p-3">
      <RosterStatusRow member={member} unframed />
      {canManage ? (
        <div className="mt-3 flex flex-col gap-2">
          {rosterFull ? (
            <select
              aria-label={`Choose locked player to move before promoting ${member.displayName}`}
              value={replaceUserId}
              onChange={(event) => setReplaceUserId(event.target.value)}
              className="h-9 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs text-[color:var(--color-text)] outline-none focus:border-[color:var(--accent-soft)]"
            >
              <option value="">Move locked player to waitlist</option>
              {activeRoster.map((active) => (
                <option key={active.userId} value={active.userId}>
                  {active.displayName}
                </option>
              ))}
            </select>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || (rosterFull && !replaceUserId)}
            onClick={() => onPromote(member.userId, replaceUserId || null)}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {busy ? "Moving" : "Move to locked"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function RosterStatusRow({
  compact = false,
  member,
  unframed = false,
}: {
  compact?: boolean;
  member: TournamentOptInSummary["members"][number];
  unframed?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-start justify-between gap-3",
        compact ? "rounded-lg px-2 py-2" : "rounded-lg p-3",
        !compact && !unframed ? "border border-white/7 bg-white/[0.02]" : null,
      )}
    >
      <div className="flex min-w-[12rem] flex-1 items-center gap-3">
        <Avatar className="h-8 w-8">
          {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt={member.displayName} /> : null}
          <AvatarFallback>{initials(member.displayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{member.displayName}</div>
          <div className="mt-0.5 flex flex-wrap gap-1">
            <RoleBadge role={member.preferredRole} primary />
            {member.secondaryRoles.map((role) => (
              <RoleBadge key={role} role={role} />
            ))}
          </div>
        </div>
      </div>
      <StatusBadge status={member.status} waitlistPosition={member.waitlistPosition} />
    </div>
  );
}

function RoleBadge({ primary = false, role }: { primary?: boolean; role: TournamentOptInSummary["members"][number]["preferredRole"] }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]",
        primary
          ? "border-[color:var(--accent-soft)] bg-[color:var(--accent-dim)] text-[color:var(--accent)]"
          : "border-white/10 bg-white/[0.03] text-[color:var(--color-muted)]",
      )}
    >
      {primary ? roleLabel(role) : role}
    </span>
  );
}

function StatusBadge({
  status,
  waitlistPosition,
}: {
  status: TournamentOptInStatus | null;
  waitlistPosition?: number | null;
}) {
  if (status === "active") return <Badge variant="success">Locked</Badge>;
  if (status === "waitlist") return <Badge variant="warning">Waitlist #{waitlistPosition ?? "-"}</Badge>;
  if (status === "out") return <Badge variant="danger">Out</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}

function CurrentUserBadge({
  status,
  waitlistPosition,
}: {
  status: TournamentOptInStatus | null;
  waitlistPosition: number | null;
}) {
  if (status === "active") return <Badge variant="success">You are locked</Badge>;
  if (status === "waitlist") return <Badge variant="warning">You are waitlist #{waitlistPosition ?? "-"}</Badge>;
  if (status === "out") return <Badge variant="danger">You are out</Badge>;
  return <Badge variant="outline">Your status pending</Badge>;
}

function CountTile({
  label,
  value,
  variant,
}: {
  label: string;
  value: number | string;
  variant: "success" | "pending" | "danger";
}) {
  const color =
    variant === "success"
      ? "text-green-400"
      : variant === "danger"
        ? "text-red-400"
        : "text-[color:var(--color-muted)]";

  return (
    <div className="rounded-lg border border-white/7 bg-black/15 p-3 text-center">
      <div className={`font-display text-2xl ${color}`}>{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
        {label}
      </div>
    </div>
  );
}

function formatOptInActionLabel(summary: TournamentOptInSummary) {
  if (summary.currentUserStatus === "active") return "LOCKED";
  if (summary.currentUserStatus === "waitlist") {
    return `WAITLIST #${summary.currentUserWaitlistPosition ?? "-"}`;
  }
  return summary.activeCount >= summary.rosterLimit ? "JOIN WAITLIST" : "OPT IN";
}

function formatSummaryCounts(summary: TournamentOptInSummary) {
  return `${summary.activeCount}/${summary.rosterLimit} locked · ${summary.waitlistCount} waitlist · ${summary.pendingCount} pending`;
}
