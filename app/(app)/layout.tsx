import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TEAMS, type TeamSlug, DEFAULT_CHANNELS } from "@/lib/constants";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ChatRail } from "@/components/layout/chat-rail";

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

  const [{ data: channels }, { data: members }] = await Promise.all([
    supabase
      .from("chat_channels")
      .select("id, slug, name")
      .eq("team_id", session.team.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("users")
      .select("id, display_name, email, avatar_url, status")
      .eq("team_id", session.team.id)
      .order("display_name", { ascending: true }),
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
        .select("id, body, author_id, created_at")
        .eq("channel_id", activeChannel.id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] as Array<{ id: string; body: string; author_id: string; created_at: string }> };

  const membersById = Object.fromEntries(
    (members ?? []).map((m) => [m.id, m]),
  );
  const messages = (recent ?? [])
    .slice()
    .reverse()
    .map((m) => ({
      id: m.id,
      author_id: m.author_id,
      body: m.body,
      created_at: m.created_at,
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
      className="relative z-10 flex min-h-screen"
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
      <div className="flex-1 flex min-w-0">
        <main className="flex-1 flex flex-col min-w-0">
          <Topbar
            user={{
              display_name: session.user.display_name,
              avatar_url: session.user.avatar_url,
              email: session.user.email,
              role: session.user.role,
            }}
            teamName={session.team.name}
          />
          <div className="flex-1 min-w-0 p-6 animate-slide-up">{children}</div>
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
          teamId={session.team.id}
        />
      </div>
    </div>
  );
}
