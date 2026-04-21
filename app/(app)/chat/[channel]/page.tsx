import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FullChat } from "@/components/chat/full-chat";
import type { UserRow } from "@/types/domain";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ channel: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { channel } = await params;
  return { title: `#${channel}` };
}

export default async function ChatChannelPage({ params }: Props) {
  const { channel } = await params;
  const { user, team } = await requireSession();
  const supabase = await createSupabaseServerClient();

  const { data: channels } = await supabase
    .from("chat_channels")
    .select("id, slug, name, description")
    .eq("team_id", team.id)
    .order("created_at", { ascending: true });

  const list = channels ?? [];
  const active = list.find((c) => c.slug === channel);
  if (!active) notFound();

  const [{ data: recent }, { data: members }] = await Promise.all([
    supabase
      .from("chat_messages")
      .select("id, channel_id, author_id, body, created_at")
      .eq("channel_id", active.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("users")
      .select("id, display_name, email, avatar_url, status")
      .eq("team_id", team.id),
  ]);

  const messages = (recent ?? []).slice().reverse();

  return (
    <div className="flex flex-col gap-5 max-w-[1400px]">
      <header>
        <div className="eyebrow">Team Chat</div>
        <h1 className="font-display text-3xl tracking-wide mt-1">
          {team.name} · #{active.name}
        </h1>
      </header>
      <FullChat
        channels={list}
        activeSlug={active.slug}
        members={
          (members ?? []) as Array<
            Pick<UserRow, "id" | "display_name" | "email" | "avatar_url" | "status">
          >
        }
        initialMessages={messages}
        currentUserId={user.id}
      />
    </div>
  );
}
