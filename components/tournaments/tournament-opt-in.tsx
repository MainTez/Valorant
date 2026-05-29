"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, XCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";
import type {
  TournamentOptInStatus,
  TournamentOptInSummary,
} from "@/lib/tournaments/opt-in";

const SUMMARY_EVENT = "nexus:tournament-opt-in-summary";

export function TournamentOptInTopbar({
  initialSummary,
}: {
  initialSummary: TournamentOptInSummary;
}) {
  const { busyStatus, error, summary, updateStatus } = useTournamentOptIn(initialSummary);
  return (
    <>
      <div className="hidden items-center gap-1 rounded-[1rem] border border-white/10 bg-white/[0.025] p-1 lg:flex">
        <OptInButton
          active={summary.currentUserStatus === "in"}
          busy={busyStatus === "in"}
          disabled={busyStatus !== null}
          label="OPT IN"
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
        <DropdownMenuContent align="end" className="w-80 p-0">
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
                active={summary.currentUserStatus === "in"}
                busy={busyStatus === "in"}
                disabled={busyStatus !== null}
                label="OPT IN"
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
            {summary.members.map((member) => (
              <RosterStatusRow key={member.userId} member={member} compact />
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export function TournamentOptInPanel({
  initialSummary,
}: {
  initialSummary: TournamentOptInSummary;
}) {
  const { busyStatus, error, summary, updateStatus } = useTournamentOptIn(initialSummary);
  const optedInMembers = useMemo(
    () => summary.members.filter((member) => member.status === "in"),
    [summary.members],
  );

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
            active={summary.currentUserStatus === "in"}
            busy={busyStatus === "in"}
            disabled={busyStatus !== null}
            label="OPT IN"
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
            <div className="text-sm font-semibold">Ready roster</div>
            <CurrentUserBadge status={summary.currentUserStatus} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <CountTile label="In" value={summary.optedInCount} variant="success" />
            <CountTile label="Pending" value={summary.pendingCount} variant="pending" />
            <CountTile label="Out" value={summary.optedOutCount} variant="danger" />
          </div>
          <div className="mt-4 text-xs uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
            {optedInMembers.length > 0
              ? `${optedInMembers.map((member) => member.displayName).join(", ")} ready`
              : "Nobody has opted in yet"}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {summary.members.map((member) => (
            <RosterStatusRow key={member.userId} member={member} />
          ))}
        </div>
      </div>
    </section>
  );
}

function useTournamentOptIn(initialSummary: TournamentOptInSummary) {
  const [summary, setSummary] = useState(initialSummary);
  const [busyStatus, setBusyStatus] = useState<TournamentOptInStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function updateStatus(status: TournamentOptInStatus) {
    setBusyStatus(status);
    setError(null);
    try {
      const response = await fetch("/api/tournaments/opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournament_key: summary.tournamentKey,
          status,
        }),
      });
      const payload = (await response.json()) as {
        data?: TournamentOptInSummary;
        error?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not save opt-in status");
      }
      setSummary(payload.data);
      window.dispatchEvent(new CustomEvent(SUMMARY_EVENT, { detail: payload.data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save opt-in status");
    } finally {
      setBusyStatus(null);
    }
  }

  return { busyStatus, error, summary, updateStatus };
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
  status: TournamentOptInStatus;
  onClick: (status: TournamentOptInStatus) => void;
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

function RosterStatusRow({
  compact = false,
  member,
}: {
  compact?: boolean;
  member: TournamentOptInSummary["members"][number];
}) {
  return (
    <div
      className={
        compact
          ? "flex items-center justify-between gap-3 rounded-lg px-2 py-2"
          : "flex items-center justify-between gap-3 rounded-lg border border-white/7 bg-white/[0.02] p-3"
      }
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="h-8 w-8">
          {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt={member.displayName} /> : null}
          <AvatarFallback>{initials(member.displayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{member.displayName}</div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
            {member.updatedAt ? "updated" : "not answered"}
          </div>
        </div>
      </div>
      <StatusBadge status={member.status} />
    </div>
  );
}

function StatusBadge({ status }: { status: TournamentOptInStatus | null }) {
  if (status === "in") return <Badge variant="success">In</Badge>;
  if (status === "out") return <Badge variant="danger">Out</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}

function CurrentUserBadge({ status }: { status: TournamentOptInStatus | null }) {
  if (status === "in") return <Badge variant="success">You are in</Badge>;
  if (status === "out") return <Badge variant="danger">You are out</Badge>;
  return <Badge variant="outline">Your status pending</Badge>;
}

function CountTile({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
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

function formatSummaryCounts(summary: TournamentOptInSummary) {
  return `${summary.optedInCount} in · ${summary.pendingCount} pending · ${summary.optedOutCount} out`;
}
