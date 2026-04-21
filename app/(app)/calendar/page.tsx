import { CalendarDays } from "lucide-react";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/common/empty-state";
import type { ScheduleEventRow } from "@/types/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const { team } = await requireSession();
  const supabase = await createSupabaseServerClient();

  const start = new Date();
  start.setDate(start.getDate() - 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setDate(end.getDate() + 60);
  end.setHours(23, 59, 59, 999);

  const { data: events } = await supabase
    .from("schedule_events")
    .select("*")
    .eq("team_id", team.id)
    .gte("start_at", start.toISOString())
    .lte("start_at", end.toISOString())
    .order("start_at", { ascending: true });

  const list = (events ?? []) as ScheduleEventRow[];
  const grouped = groupByDay(list);

  return (
    <div className="flex flex-col gap-5 max-w-[1200px]">
      <header>
        <div className="eyebrow">Calendar</div>
        <h1 className="font-display text-3xl tracking-wide mt-1">
          {team.name} schedule
        </h1>
        <p className="text-[color:var(--color-muted)] mt-1">
          Next 60 days of practice, scrims, matches, and reviews.
        </p>
      </header>

      {list.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing on the calendar"
          description="Coach / admin can add schedule events via the Supabase admin or an upcoming calendar form."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {[...grouped.entries()].map(([day, dayEvents]) => (
            <div key={day} className="surface p-5">
              <div className="eyebrow mb-3">
                {new Date(day).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div className="flex flex-col gap-2">
                {dayEvents.map((e) => {
                  const t = new Date(e.start_at);
                  return (
                    <div
                      key={e.id}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)] shadow-[0_0_8px_var(--accent)]" />
                        <span className="font-display text-sm tracking-wide w-20">
                          {t.toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="text-sm">{e.title}</span>
                      </div>
                      <div className="text-[11px] uppercase tracking-widest text-[color:var(--color-muted)]">
                        {e.kind}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function groupByDay(events: ScheduleEventRow[]): Map<string, ScheduleEventRow[]> {
  const map = new Map<string, ScheduleEventRow[]>();
  for (const e of events) {
    const key = new Date(e.start_at).toISOString().slice(0, 10);
    const bucket = map.get(key) ?? [];
    bucket.push(e);
    map.set(key, bucket);
  }
  return map;
}
