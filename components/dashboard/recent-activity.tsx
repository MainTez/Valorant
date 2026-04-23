import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials, relativeTime } from "@/lib/utils";
import type { ActivityEventRow, UserRow } from "@/types/domain";

interface Props {
  events: Array<ActivityEventRow & { actor?: Pick<UserRow, "display_name" | "avatar_url" | "email"> | null }>;
}

const VERB_LABEL: Record<string, string> = {
  uploaded_match_vod: "uploaded a VOD",
  removed_match_vod: "removed a VOD",
  deleted_match: "deleted a match",
  logged_match: "logged a match",
  completed_routine: "completed the routine",
  added_note: "added a note",
  updated_task: "updated a task",
  whitelisted_user: "added a member",
  signin: "signed in",
};

export function RecentActivity({ events }: Props) {
  return (
    <div className="surface p-5 h-full">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Recent Activity</span>
        <Link href="/matches" className="text-xs accent-text hover:underline">
          View all
        </Link>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {events.length === 0 ? (
          <p className="text-sm text-[color:var(--color-muted)]">
            No activity yet — it will show here as your team uses the hub.
          </p>
        ) : (
          events.slice(0, 6).map((e) => {
            const who = e.actor?.display_name ?? e.actor?.email?.split("@")[0] ?? "Someone";
            const what = VERB_LABEL[e.verb] ?? e.verb.replace(/_/g, " ");
            return (
              <div key={e.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  {e.actor?.avatar_url ? (
                    <AvatarImage src={e.actor.avatar_url} alt={who} />
                  ) : null}
                  <AvatarFallback>{initials(who)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="font-semibold">{who}</span>{" "}
                    <span className="text-[color:var(--color-muted)]">{what}</span>
                  </div>
                  <div className="text-[11px] uppercase tracking-widest text-[color:var(--color-muted)] mt-0.5">
                    {relativeTime(e.created_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
