import { CalendarDays } from "lucide-react";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { ScheduleEventDialog } from "@/components/calendar/schedule-event-dialog";
import type { ScheduleEventRow, UserRow } from "@/types/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const { user, team } = await requireSession();
  const supabase = await createSupabaseServerClient();
  const canManage = user.role === "coach" || user.role === "admin";

  const start = new Date();
  start.setDate(start.getDate() - 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setDate(end.getDate() + 60);
  end.setHours(23, 59, 59, 999);

  const eventsQuery = supabase
    .from("schedule_events")
    .select("*")
    .eq("team_id", team.id)
    .gte("start_at", start.toISOString())
    .lte("start_at", end.toISOString())
    .order("start_at", { ascending: true });
  const membersQuery = supabase
    .from("users")
    .select("id, display_name, email")
    .eq("team_id", team.id)
    .order("display_name", { ascending: true });

  const [{ data: events }, { data: members }] = await Promise.all([eventsQuery, membersQuery]);

  const list = (events ?? []) as ScheduleEventRow[];
  const teamMembers = (members ?? []) as Array<Pick<UserRow, "id" | "display_name" | "email">>;
  const memberNameById = new Map(teamMembers.map((member) => [member.id, memberName(member)]));
  const grouped = groupByDay(list);

  return (
    <div className="flex flex-col gap-5 max-w-[1200px]">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="eyebrow">Calendar</div>
          <h1 className="font-display text-3xl tracking-wide mt-1">
            {team.name} schedule
          </h1>
          <p className="text-[color:var(--color-muted)] mt-1">
            Next 60 days of practice, scrims, matches, and reviews.
          </p>
        </div>
        {canManage ? <ScheduleEventDialog members={teamMembers} /> : null}
      </header>

      {list.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing on the calendar"
          description={
            canManage
              ? "Create the first team event to keep practice, reviews, and match prep visible."
              : "Coach / admin can add schedule events from this page."
          }
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
                  const participantLabels = participantsForEvent(e, memberNameById);
                  return (
                    <div
                      key={e.id}
                      className="flex flex-col gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)] shadow-[0_0_8px_var(--accent)]" />
                          <span className="font-display text-sm tracking-wide w-28">
                            {formatTimeRange(e)}
                          </span>
                          <span className="truncate text-sm font-medium">{e.title}</span>
                        </div>
                        {e.location || participantLabels.length > 0 || e.description ? (
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[color:var(--color-muted)] md:pl-[124px]">
                            {e.location ? <span>{e.location}</span> : null}
                            {participantLabels.length > 0 ? (
                              <span>{participantLabels.join(", ")}</span>
                            ) : null}
                            {e.description ? (
                              <span className="line-clamp-1">{e.description}</span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 self-end md:self-auto">
                        <Badge variant="outline">{e.kind}</Badge>
                        {canManage ? (
                          <ScheduleEventDialog event={e} members={teamMembers} />
                        ) : null}
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

function formatTimeRange(event: ScheduleEventRow): string {
  const start = formatEventTime(event.start_at);
  if (!event.end_at) return start;
  return `${start} - ${formatEventTime(event.end_at)}`;
}

function formatEventTime(value: string): string {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function memberName(member: Pick<UserRow, "display_name" | "email">): string {
  return member.display_name ?? member.email.split("@")[0] ?? member.email;
}

function participantsForEvent(event: ScheduleEventRow, lookup: Map<string, string>): string[] {
  const labels: string[] = [];
  for (const id of event.participants ?? []) {
    const label = lookup.get(id);
    if (label) labels.push(label);
  }
  return labels;
}
