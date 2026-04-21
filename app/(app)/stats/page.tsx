import Link from "next/link";
import { Users, Search as SearchIcon } from "lucide-react";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PlayerSearch } from "@/components/stats/player-search";
import { EmptyState } from "@/components/common/empty-state";
import { RankBadge } from "@/components/common/rank-badge";
import { defaultRegion } from "@/lib/henrik/regions";
import type { PlayerProfileRow, UserRow } from "@/types/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stats Tracker" };

export default async function StatsIndexPage() {
  const { team } = await requireSession();
  const supabase = await createSupabaseServerClient();

  const [{ data: profiles }, { data: members }] = await Promise.all([
    supabase
      .from("player_profiles")
      .select("*")
      .eq("team_id", team.id)
      .order("last_synced_at", { ascending: false, nullsFirst: false })
      .limit(24),
    supabase
      .from("users")
      .select("id, display_name, avatar_url, email, riot_name, riot_tag, riot_region")
      .eq("team_id", team.id),
  ]);

  const rosterWithRiot = ((members ?? []) as Array<Partial<UserRow>>).filter(
    (u) => u.riot_name && u.riot_tag,
  );

  return (
    <div className="flex flex-col gap-6 max-w-[1400px]">
      <header>
        <div className="eyebrow">Stats Tracker</div>
        <h1 className="font-display text-3xl tracking-wide mt-1">Track any player</h1>
        <p className="text-[color:var(--color-muted)] mt-1">
          Search by Riot name and tag to pull live stats from HenrikDev. Team
          rosters surface automatically below.
        </p>
      </header>

      <PlayerSearch defaultRegion={defaultRegion()} />

      <section>
        <div className="eyebrow mb-3">Roster — {team.name}</div>
        {rosterWithRiot.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Riot IDs linked yet"
            description="Team members can add their Riot name + tag from Players → Profile."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rosterWithRiot.map((u) => (
              <Link
                key={u.id}
                href={`/stats/${encodeURIComponent(u.riot_name!)}/${encodeURIComponent(u.riot_tag!)}?region=${u.riot_region ?? "eu"}`}
                className="surface p-4 flex items-center gap-4 hover-lift"
              >
                <div className="h-10 w-10 rounded-full border border-white/10 bg-white/5 grid place-items-center">
                  <SearchIcon className="h-4 w-4 text-[color:var(--color-muted)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display tracking-wide text-lg truncate">
                    {u.display_name ?? u.riot_name}
                  </div>
                  <div className="text-xs text-[color:var(--color-muted)] truncate">
                    {u.riot_name}#{u.riot_tag} · {(u.riot_region ?? "eu").toUpperCase()}
                  </div>
                </div>
                <span className="text-[color:var(--accent)] text-xs">Track →</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {profiles && profiles.length > 0 ? (
        <section>
          <div className="eyebrow mb-3">Recently tracked</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(profiles as PlayerProfileRow[]).map((p) => (
              <Link
                key={p.id}
                href={`/stats/${encodeURIComponent(p.riot_name)}/${encodeURIComponent(p.riot_tag)}?region=${p.region ?? "eu"}`}
                className="surface p-4 flex items-center justify-between gap-3 hover-lift"
              >
                <div className="min-w-0">
                  <div className="font-display tracking-wide text-lg truncate">
                    {p.riot_name}{" "}
                    <span className="text-[color:var(--color-muted)]">
                      #{p.riot_tag}
                    </span>
                  </div>
                  <div className="text-xs text-[color:var(--color-muted)]">
                    {p.last_synced_at
                      ? `Synced ${new Date(p.last_synced_at).toLocaleDateString()}`
                      : "Not synced yet"}
                  </div>
                </div>
                <RankBadge rank={p.current_rank} rr={p.current_rr ?? undefined} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
