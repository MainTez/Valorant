"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";
import type { DesktopMoment } from "@/components/desktop/types";

interface MomentsResponse {
  data?: DesktopMoment[];
  error?: string;
}

const OUTCOME_META = {
  win: {
    verb: "WON",
    titleClass: "text-emerald-300",
    borderClass: "border-emerald-400/35",
    railClass: "bg-emerald-400",
  },
  loss: {
    verb: "LOST",
    titleClass: "text-red-300",
    borderClass: "border-red-400/35",
    railClass: "bg-red-400",
  },
  draw: {
    verb: "DREW",
    titleClass: "text-white/76",
    borderClass: "border-white/14",
    railClass: "bg-white/40",
  },
} as const;

export function MatchMomentNotifier({ teamId }: { teamId: string }) {
  const [moment, setMoment] = useState<DesktopMoment | null>(null);
  const seenRef = useRef(new Set<string>());
  const hideTimerRef = useRef<number | null>(null);
  const mountedAtRef = useRef(Date.now());

  const showMoment = useCallback((nextMoment: DesktopMoment) => {
    if (seenRef.current.has(nextMoment.id)) return;
    seenRef.current.add(nextMoment.id);

    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }

    setMoment(nextMoment);
    hideTimerRef.current = window.setTimeout(() => setMoment(null), 7_500);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function seedSeenMoments() {
      const moments = await loadLatestMoments();
      if (cancelled) return;
      for (const item of moments) {
        const createdAt = new Date(item.created_at).getTime();
        if (Number.isFinite(createdAt) && createdAt <= mountedAtRef.current) {
          seenRef.current.add(item.id);
        }
      }
    }

    void seedSeenMoments();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onCreated(event: Event) {
      const moments = (event as CustomEvent<DesktopMoment[]>).detail ?? [];
      const latest = moments.find((item) => item?.id);
      if (latest) showMoment(latest);
    }

    window.addEventListener("match-moment:created", onCreated);
    return () => window.removeEventListener("match-moment:created", onCreated);
  }, [showMoment]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`app-match-moments:${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_moments",
          filter: `team_id=eq.${teamId}`,
        },
        async (payload) => {
          const id = String((payload.new as { id?: string }).id ?? "");
          if (!id || seenRef.current.has(id)) return;

          const moments = await loadLatestMoments();
          const enriched = moments.find((item) => item.id === id) ?? (payload.new as DesktopMoment);
          showMoment(enriched);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [showMoment, teamId]);

  if (!moment) return null;

  const outcome = outcomeForMoment(moment);
  const meta = OUTCOME_META[outcome];
  const playerName = playerNameForMoment(moment);
  const stats = moment.stats as { kda?: string; score?: string };

  return (
    <div
      className={cn(
        "fixed right-5 top-[5.25rem] z-50 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-[#090d14]/96 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.48)] backdrop-blur-xl animate-slide-up",
        meta.borderClass,
      )}
      role="status"
      aria-live="polite"
    >
      <div aria-hidden className={cn("absolute inset-y-0 left-0 w-1", meta.railClass)} />
      <div className="flex items-start gap-3 pl-1">
        <Avatar className="h-10 w-10">
          {moment.actor?.avatar_url ? (
            <AvatarImage src={moment.actor.avatar_url} alt={playerName} />
          ) : null}
          <AvatarFallback>{initials(playerName)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
            Match result
          </div>
          <div className="mt-1 text-sm leading-5">
            <span className="font-semibold text-white">{playerName}</span>{" "}
            <span className={cn("font-bold", meta.titleClass)}>{meta.verb}</span>{" "}
            <span className="text-white/70">their game</span>
          </div>
          <div className="mt-2 truncate text-xs text-[color:var(--color-muted)]">
            {stats.kda ?? "KDA --"} · {stats.score ?? "--"} · {moment.label}
          </div>
        </div>

        <button
          type="button"
          aria-label="Dismiss match notification"
          onClick={() => setMoment(null)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/8 text-white/52 transition hover:border-white/18 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

async function loadLatestMoments(): Promise<DesktopMoment[]> {
  const res = await fetch("/api/desktop/moments?limit=20");
  const body = (await res.json().catch(() => ({}))) as MomentsResponse;
  if (!res.ok) return [];
  return body.data ?? [];
}

function outcomeForMoment(moment: Pick<DesktopMoment, "label">): keyof typeof OUTCOME_META {
  if (
    moment.label === "Won match" ||
    moment.label === "CARRIED ALL!!" ||
    moment.label === "GOT CARRIED"
  ) {
    return "win";
  }

  if (
    moment.label === "Lost match" ||
    moment.label === "INTED MATCH" ||
    moment.label === "TEAM SOLD HIM"
  ) {
    return "loss";
  }

  return "draw";
}

function playerNameForMoment(moment: DesktopMoment): string {
  return (
    moment.actor?.display_name ??
    moment.actor?.email?.split("@")[0] ??
    moment.profile?.riot_name ??
    "Teammate"
  );
}
