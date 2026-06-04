import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TEAMS, type TeamSlug, DEFAULT_CHANNELS } from "@/lib/constants";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ChatRail } from "@/components/layout/chat-rail";
import {
  ACTIVE_TOURNAMENT_OPT_IN_KEY,
  buildTournamentOptInSummary,
  TOURNAMENT_OPT_IN_OBJECT_TYPE,
  TOURNAMENT_OPT_IN_VERBS,
} from "@/lib/tournaments/opt-in";
import type { ActivityEventRow, UserRow } from "@/types/domain";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const teamSlug = (TEAMS as Record<string, { slug: TeamSlug }>)[session.team.slug]
    ? (session.team.slug as TeamSlug)
    : "surf-n-bulls";

  const [{ data: channels }, { data: members }, { data: tournamentOptInEvents }] = await Promise.all([
    supabase
      .from("chat_channels")
      .select("id, slug, name")
      .eq("team_id", session.team.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("users")
      .select("id, display_name, email, avatar_url, status, preferred_valorant_role, secondary_valorant_roles")
      .eq("team_id", session.team.id)
      .order("display_name", { ascending: true }),
    session.team.slug === "surf-n-bulls"
      ? supabase
          .from("activity_events")
          .select("actor_id, verb, object_id, payload, created_at")
          .eq("team_id", session.team.id)
          .eq("object_type", TOURNAMENT_OPT_IN_OBJECT_TYPE)
          .eq("object_id", ACTIVE_TOURNAMENT_OPT_IN_KEY)
          .in("verb", [...TOURNAMENT_OPT_IN_VERBS])
          .order("created_at", { ascending: false })
          .limit(250)
      : Promise.resolve({ data: [] }),
  ]);

  const channelList =
    (channels ?? []).length > 0
      ? (channels as Array<{ id: string; slug: string; name: string }>)
      : DEFAULT_CHANNELS.map((slug) => ({ id: slug, slug, name: slug }));

  const cookieStore = await cookies();
  const activeSlugRaw = cookieStore.get("active_channel")?.value;
  const activeChannelSlug = channelList.find((c) => c.slug === activeSlugRaw)?.slug ?? "general";

  const activeChannel = channelList.find((c) => c.slug === activeChannelSlug);
  const { data: recent } = activeChannel
    ? await supabase
        .from("chat_messages")
        .select("id, body, author_id, created_at, updated_at")
        .eq("channel_id", activeChannel.id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] as Array<{ id: string; body: string; author_id: string; created_at: string; updated_at: string | null }> };

  const membersById = Object.fromEntries(
    (members ?? []).map((m) => [m.id, m]),
  );
  const tournamentOptIn =
    session.team.slug === "surf-n-bulls"
      ? buildTournamentOptInSummary({
          tournamentKey: ACTIVE_TOURNAMENT_OPT_IN_KEY,
          currentUserId: session.user.id,
          members: (members ?? []) as Pick<
            UserRow,
            | "id"
            | "display_name"
            | "email"
            | "avatar_url"
            | "preferred_valorant_role"
            | "secondary_valorant_roles"
          >[],
          events: (tournamentOptInEvents ?? []) as Pick<ActivityEventRow, "actor_id" | "verb" | "object_id" | "payload" | "created_at">[],
        })
      : null;
  const messages = (recent ?? [])
    .slice()
    .reverse()
    .map((m) => ({
      id: m.id,
      author_id: m.author_id,
      body: m.body,
      created_at: m.created_at,
      updated_at: m.updated_at,
      author:
        membersById[m.author_id] ?? {
          id: m.author_id,
          display_name: null,
          email: "",
          avatar_url: null,
          status: null,
        },
    }));

  return (
    <div
      data-team={teamSlug}
      className="relative z-10 flex min-h-screen overflow-x-hidden"
    >
      <Sidebar
        team={teamSlug}
        user={{
          display_name: session.user.display_name,
          avatar_url: session.user.avatar_url,
          email: session.user.email,
          role: session.user.role,
        }}
      />
      <div className="flex min-w-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
          <Topbar
            user={{
              id: session.user.id,
              display_name: session.user.display_name,
              avatar_url: session.user.avatar_url,
              email: session.user.email,
              role: session.user.role,
            }}
            teamId={session.team.id}
            teamName={session.team.name}
            tournamentOptIn={tournamentOptIn}
          />
          <div className="flex-1 min-w-0 px-5 py-5 animate-slide-up xl:px-6">{children}</div>
        </main>
        <ChatRail
          channels={channelList}
          members={(members ?? []).map((m) => ({
            ...m,
            status: m.status ?? "offline",
          }))}
          activeChannelSlug={activeChannelSlug}
          initialMessages={messages}
          currentUserId={session.user.id}
          currentUserRole={session.user.role}
          teamId={session.team.id}
        />
      </div>
    </div>
  );
}
