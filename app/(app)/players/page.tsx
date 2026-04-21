import Link from "next/link";
import { LineChart, Sparkles, Users } from "lucide-react";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RankBadge } from "@/components/common/rank-badge";
import { EmptyState } from "@/components/common/empty-state";
import { initials } from "@/lib/utils";
import type { PlayerProfileRow, UserRow } from "@/types/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "Players" };

export default async function PlayersPage() {
  const { team } = await requireSession();
  const supabase = await createSupabaseServerClient();

  const [{ data: users }, { data: profiles }] = await Promise.all([
    supabase
      .from("users")
      .select("*")
      .eq("team_id", team.id)
      .order("display_name", { ascending: true }),
    supabase
      .from("player_profiles")
      .select("*")
      .eq("team_id", team.id),
  ]);

  const list = (users ?? []) as UserRow[];
  const profilesByRiot = new Map(
    ((profiles ?? []) as PlayerProfileRow[]).map((p) => [
      `${p.riot_name.toLowerCase()}#${p.riot_tag.toLowerCase()}`,
      p,
    ]),
  );

  return (
    <div className="flex flex-col gap-5 max-w-[1400px]">
      <header>
        <div className="eyebrow">Roster</div>
        <h1 className="font-display text-3xl tracking-wide mt-1">{team.name}</h1>
        <p className="text-[color:var(--color-muted)] mt-1">
          Team members. Click through for stats and AI insights.
        </p>
      </header>

      {list.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members yet"
          description="Ask an admin to add members via the whitelist."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((u) => {
            const profile =
              u.riot_name && u.riot_tag
                ? profilesByRiot.get(`${u.riot_name.toLowerCase()}#${u.riot_tag.toLowerCase()}`)
                : undefined;
            return (
              <div key={u.id} className="surface p-5 hover-lift flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    {u.avatar_url ? (
                      <AvatarImage src={u.avatar_url} alt={u.display_name ?? u.email} />
                    ) : null}
                    <AvatarFallback>{initials(u.display_name ?? u.email)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-lg tracking-wide truncate">
                      {u.display_name ?? u.email.split("@")[0]}
                    </div>
                    <div className="text-xs text-[color:var(--color-muted)] truncate">{u.email}</div>
                  </div>
                  <Badge variant="outline">{u.role}</Badge>
                </div>
                {u.riot_name && u.riot_tag ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-[color:var(--color-muted)]">Riot ID</div>
                      <div className="font-display tracking-wide">
                        {u.riot_name}
                        <span className="text-[color:var(--color-muted)]"> #{u.riot_tag}</span>
                      </div>
                    </div>
                    <RankBadge
                      rank={profile?.current_rank}
                      rr={profile?.current_rr ?? undefined}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-[color:var(--color-muted)]">
                    No Riot ID linked yet.
                  </p>
                )}
                {u.riot_name && u.riot_tag ? (
                  <div className="flex gap-2 mt-auto">
                    <Link
                      href={`/stats/${encodeURIComponent(u.riot_name)}/${encodeURIComponent(u.riot_tag)}?region=${u.riot_region ?? "eu"}`}
                      className="btn-ghost flex-1 justify-center"
                    >
                      <LineChart className="h-4 w-4" /> Stats
                    </Link>
                    <Link
                      href={`/insights/${encodeURIComponent(u.riot_name)}/${encodeURIComponent(u.riot_tag)}?region=${u.riot_region ?? "eu"}`}
                      className="btn-ghost flex-1 justify-center text-[color:var(--accent)]"
                    >
                      <Sparkles className="h-4 w-4" /> Insights
                    </Link>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
