import { Calendar, Clock, Map as MapIcon, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TeamEmblem } from "@/components/common/team-emblem";
import type { TeamSlug } from "@/lib/constants";
import type { ScheduleEventRow } from "@/types/domain";
import Link from "next/link";

interface Props {
  team: TeamSlug;
  teamName: string;
  event: ScheduleEventRow | null;
}

export function NextMatchCard({ team, teamName, event }: Props) {
  const when = event ? new Date(event.start_at) : null;
  return (
    <div className="surface-accent relative overflow-hidden h-full">
      <div
        aria-hidden
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 80% 20%, var(--accent-dim), transparent 55%), radial-gradient(circle at 20% 90%, rgba(255,255,255,0.05), transparent 40%)",
        }}
      />
      <div className="relative p-5 flex flex-col h-full min-h-[280px]">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Next Match</span>
          <Badge>
            <span className="accent-dot" />
            {event?.kind ?? "unscheduled"}
          </Badge>
        </div>

        <div className="mt-6 flex items-center justify-center gap-8">
          <div className="flex flex-col items-center">
            <TeamEmblem team={team} size="lg" />
            <div className="mt-3 font-display tracking-[0.12em] text-sm">{teamName}</div>
          </div>

          <div className="font-display text-4xl tracking-[0.2em] text-[color:var(--color-muted)]">
            VS
          </div>

          <div className="flex flex-col items-center">
            <div
              className="h-[90px] w-[90px] rounded-xl border border-white/10 bg-white/[0.02] grid place-items-center"
              aria-hidden
            >
              <Shield className="h-10 w-10 text-[color:var(--color-muted)]" />
            </div>
            <div className="mt-3 font-display tracking-[0.12em] text-sm text-[color:var(--color-muted)]">
              {event?.title ?? "TBD"}
            </div>
          </div>
        </div>

        <div className="mt-auto pt-5 flex items-center justify-between text-sm text-[color:var(--color-muted)] border-t border-white/5">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {when
                ? when.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Not scheduled"}
            </span>
            {when ? (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {when.toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            ) : null}
            {event?.location ? (
              <span className="flex items-center gap-1.5">
                <MapIcon className="h-4 w-4" />
                {event.location}
              </span>
            ) : null}
          </div>
          <Link href="/calendar" className="btn-ghost !px-3 !py-1.5 text-[color:var(--accent)]">
            View match details →
          </Link>
        </div>
      </div>
    </div>
  );
}
