import { Calendar, Clock, Map as MapIcon, Swords } from "lucide-react";
import Link from "next/link";
import { formatNorwayDate, formatNorwayTime } from "@/lib/timezone";
import type { DashboardNextMatch } from "@/lib/dashboard/next-match";

export function UpcomingMatchCard({
  event,
  matches = event ? [event] : [],
}: {
  event: DashboardNextMatch | null;
  matches?: DashboardNextMatch[];
}) {
  const when = event?.startAt ?? null;
  const nextMatches = matches.slice(1, 4);

  return (
    <div className="surface flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Upcoming Match</span>
        <Swords className="h-4 w-4 text-[color:var(--color-muted)]" />
      </div>
      <div className="mt-4">
        <div className="font-display text-2xl uppercase tracking-wider">
          {event?.title ?? "No match scheduled"}
        </div>
        <div className="mt-1 text-xs uppercase tracking-widest text-[color:var(--color-muted)]">
          {event?.kind ?? "—"}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-[1.2rem_auto_1fr] gap-x-3 gap-y-2 text-sm">
        <MapIcon className="mt-0.5 h-4 w-4 text-[color:var(--color-muted)]" />
        <span className="text-[color:var(--color-muted)]">Map</span>
        <span>{event?.location ?? "—"}</span>

        <Calendar className="mt-0.5 h-4 w-4 text-[color:var(--color-muted)]" />
        <span className="text-[color:var(--color-muted)]">Date</span>
        <span>{when ? formatNorwayDate(when) : "—"}</span>

        <Clock className="mt-0.5 h-4 w-4 text-[color:var(--color-muted)]" />
        <span className="text-[color:var(--color-muted)]">Time</span>
        <span>{when ? formatNorwayTime(when) : "—"}</span>
      </div>

      {nextMatches.length > 0 ? (
        <div className="mt-5 border-t border-white/7 pt-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
            Next matches
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {nextMatches.map((match) => (
              <Link
                key={match.id}
                href={match.detailsHref}
                className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-white/7 bg-white/[0.02] px-3 py-2 transition hover:border-[color:var(--accent-soft)]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm">{match.title}</span>
                  <span className="mt-0.5 block text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
                    {match.kind}
                  </span>
                </span>
                <span className="text-right text-xs text-[color:var(--color-muted)]">
                  {match.startAt ? formatNorwayDate(match.startAt) : "TBD"}
                  <span className="mt-0.5 block">
                    {match.startAt ? formatNorwayTime(match.startAt) : ""}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <Link
        href={event?.detailsHref ?? "/calendar"}
        className="btn-ghost mt-auto justify-center pt-5 text-[color:var(--accent)]"
      >
        {event?.detailsLabel ?? "Prepare Match"}
      </Link>
    </div>
  );
}
