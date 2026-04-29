import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DesktopApp } from "@/components/desktop/desktop-app";
import type { DesktopMoment } from "@/components/desktop/types";
import type { MatchMomentRow, PlayerProfileRow, UserRow } from "@/types/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "Desktop App" };

export default async function DesktopPage() {
  const { team, user } = await requireSession();
  const moments = await loadInitialMoments(team.id);

  return (
    <div data-team={team.slug}>
      <DesktopApp
        initialMoments={moments}
        teamId={team.id}
        teamName={team.name}
        userName={user.display_name ?? user.email.split("@")[0]}
      />
    </div>
  );
}

async function loadInitialMoments(teamId: string): Promise<DesktopMoment[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("match_moments")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(40);

  const moments = (data ?? []) as MatchMomentRow[];
  const userIds = [
    ...new Set(moments.map((moment) => moment.user_id).filter((id): id is string => Boolean(id))),
  ];
  const profileIds = [...new Set(moments.map((moment) => moment.player_profile_id))];
  const [{ data: users }, { data: profiles }] = await Promise.all([
    userIds.length
      ? supabase.from("users").select("id, display_name, email, avatar_url").in("id", userIds)
      : Promise.resolve({ data: [] }),
    profileIds.length
      ? supabase
          .from("player_profiles")
          .select("id, riot_name, riot_tag, current_rank, current_rr")
          .in("id", profileIds)
      : Promise.resolve({ data: [] }),
  ]);

  const usersById = new Map(((users ?? []) as Partial<UserRow>[]).map((row) => [row.id, row]));
  const profilesById = new Map(
    ((profiles ?? []) as Partial<PlayerProfileRow>[]).map((row) => [row.id, row]),
  );

  return moments.map((moment) => ({
    ...moment,
    actor: moment.user_id ? usersById.get(moment.user_id) ?? null : null,
    profile: profilesById.get(moment.player_profile_id) ?? null,
  })) as DesktopMoment[];
}
