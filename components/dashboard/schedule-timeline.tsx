import Link from "next/link";
import { Target } from "lucide-react";
import type { ScheduleEventRow } from "@/types/domain";

export function ScheduleTimeline({ events }: { events: ScheduleEventRow[] }) {
  return (
    <div className="surface p-5 h-full flex flex-col">
      <div className="eyebrow">Today&rsquo;s Schedule</div>
      <div className="mt-4 flex-1 flex flex-col gap-3">
        {events.length === 0 ? (
          <p className="text-sm text-[color:var(--color-muted)]">
            Nothing scheduled today.
          </p>
        ) : (
          events.slice(0, 6).map((e) => {
            const t = new Date(e.start_at);
            return (
              <div key={e.id} className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-20 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)] shadow-[0_0_8px_var(--accent)]" />
                  <span className="font-display tracking-wide text-sm">
                    {t.toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm">{e.title}</div>
                    <div className="text-[11px] uppercase tracking-widest text-[color:var(--color-muted)]">
                      {e.kind}
                    </div>
                  </div>
                  <div className="text-xs text-[color:var(--color-muted)]">
                    {e.participants?.length
                      ? `${e.participants.length}/5`
                      : "—"}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <Link
        href="/routines"
        className="mt-4 btn-ghost justify-center text-[color:var(--accent)]"
      >
        <Target className="h-4 w-4" /> View Full Routine
      </Link>
    </div>
  );
}
