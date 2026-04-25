import Link from "next/link";
import { ArrowLeft, LineChart, Sparkles } from "lucide-react";
import { requireSession } from "@/lib/auth/get-session";
import { RiotProfileForm } from "@/components/players/riot-profile-form";
import { RankBadge } from "@/components/common/rank-badge";
import { SpotifyProfilePanel } from "@/components/spotify/spotify-profile-panel";
import { defaultRegion, normalizeRegion } from "@/lib/henrik/regions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PlayerProfileRow } from "@/types/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profile" };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PlayerProfilePage({ searchParams }: Props) {
  const sp = await searchParams;
  const { user, team } = await requireSession();
  const supabase = await createSupabaseServerClient();

  const profileQuery = user.riot_name && user.riot_tag
    ? supabase
        .from("player_profiles")
        .select("*")
        .eq("team_id", team.id)
        .eq("riot_name", user.riot_name)
        .eq("riot_tag", user.riot_tag)
        .maybeSingle()
    : Promise.resolve({ data: null });

  const { data } = await profileQuery;
  const profile = data as PlayerProfileRow | null;
  const region = normalizeRegion(user.riot_region ?? profile?.region ?? defaultRegion());
  const statsHref = user.riot_name && user.riot_tag
    ? `/stats/${encodeURIComponent(user.riot_name)}/${encodeURIComponent(user.riot_tag)}?region=${region}`
    : null;
  const insightsHref = user.riot_name && user.riot_tag
    ? `/insights/${encodeURIComponent(user.riot_name)}/${encodeURIComponent(user.riot_tag)}?region=${region}`
    : null;

  return (
    <div className="flex max-w-[1180px] flex-col gap-5">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            href="/players"
            className="inline-flex items-center gap-2 text-sm text-[color:var(--color-muted)] hover:accent-text"
          >
            <ArrowLeft className="h-4 w-4" />
            Players
          </Link>
          <div className="mt-4 eyebrow">Player Profile</div>
          <h1 className="mt-1 font-display text-3xl tracking-wide">Your Riot Link</h1>
          <p className="mt-1 max-w-[42rem] text-sm leading-6 text-[color:var(--color-muted)]">
            This is the roster identity used by team stats, player cards, and
            your personal tracker shortcuts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {statsHref ? (
            <Link href={statsHref} className="btn-ghost">
              <LineChart className="h-4 w-4" />
              Stats
            </Link>
          ) : null}
          {insightsHref ? (
            <Link href={insightsHref} className="btn-accent">
              <Sparkles className="h-4 w-4" />
              Insights
            </Link>
          ) : null}
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          <RiotProfileForm
            initialName={user.riot_name ?? ""}
            initialTag={user.riot_tag ?? ""}
            initialRegion={region}
          />
          <SpotifyProfilePanel status={typeof sp.spotify === "string" ? sp.spotify : null} />
        </div>

        <aside className="relative overflow-hidden rounded-[1.35rem] border border-white/7 bg-white/[0.025] p-5">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.035),transparent_44%,rgba(255,255,255,0.01)_100%)]" />
          <div className="relative">
            <div className="eyebrow">Current Link</div>
            {user.riot_name && user.riot_tag ? (
              <div className="mt-4 flex flex-col gap-4">
                <div>
                  <div className="font-display text-2xl tracking-[0.04em]">
                    {user.riot_name}
                    <span className="text-white/38"> #{user.riot_tag}</span>
                  </div>
                  <div className="mt-2 text-xs uppercase tracking-[0.22em] text-white/36">
                    {region.toUpperCase()} region
                  </div>
                </div>
                <RankBadge
                  rank={profile?.current_rank}
                  rr={profile?.current_rr ?? undefined}
                  className="w-fit"
                />
                <p className="text-sm leading-6 text-white/44">
                  If this is wrong, save a new Riot ID here. The old roster link
                  is detached from your user account when the new one is saved.
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-white/44">
                No Riot ID is attached yet. Add one to unlock your roster stats
                link and make your player card useful to coaches.
              </p>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
