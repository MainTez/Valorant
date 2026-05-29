import { Calendar, Clock, Map as MapIcon, Swords } from "lucide-react";
import Link from "next/link";
import { formatNorwayDate, formatNorwayTime } from "@/lib/timezone";
import type { ScheduleEventRow } from "@/types/domain";

export function UpcomingMatchCard({ event }: { event: ScheduleEventRow | null }) {
  const when = event?.start_at ?? null;
  return (
    <div className="surface p-5 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Upcoming Match</span>
        <Swords className="h-4 w-4 text-[color:var(--color-muted)]" />
      </div>
      <div className="mt-4">
        <div className="font-display text-2xl tracking-wider uppercase">
          {event?.title ?? "No match scheduled"}
        </div>
        <div className="text-xs uppercase tracking-widest text-[color:var(--color-muted)] mt-1">
          {event?.kind ?? "—"}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-[1.2rem_auto_1fr] gap-y-2 gap-x-3 text-sm">
        <MapIcon className="h-4 w-4 text-[color:var(--color-muted)] mt-0.5" />
        <span className="text-[color:var(--color-muted)]">Map</span>
        <span>{event?.location ?? "—"}</span>

        <Calendar className="h-4 w-4 text-[color:var(--color-muted)] mt-0.5" />
        <span className="text-[color:var(--color-muted)]">Date</span>
        <span>
          {when ? formatNorwayDate(when) : "—"}
        </span>

        <Clock className="h-4 w-4 text-[color:var(--color-muted)] mt-0.5" />
        <span className="text-[color:var(--color-muted)]">Time</span>
        <span>
          {when ? formatNorwayTime(when) : "—"}
        </span>
      </div>
      <Link
        href="/calendar"
        className="mt-auto pt-5 btn-ghost justify-center text-[color:var(--accent)]"
      >
        Prepare Match
      </Link>
    </div>
  );
}
