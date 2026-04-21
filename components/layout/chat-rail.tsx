"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Hash, Plus, Send } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials, relativeTime } from "@/lib/utils";

interface ChannelSummary {
  id: string;
  slug: string;
  name: string;
}

interface MemberSummary {
  id: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  status: "online" | "away" | "offline" | null;
}

interface RailMessage {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: MemberSummary | null;
}

interface Props {
  channels: ChannelSummary[];
  members: MemberSummary[];
  activeChannelSlug: string;
  initialMessages: RailMessage[];
  currentUserId: string;
  teamId: string;
}

export function ChatRail({
  channels,
  members,
  activeChannelSlug,
  initialMessages,
  currentUserId,
  teamId,
}: Props) {
  const supabase = createSupabaseBrowserClient();
  const activeChannel = channels.find((c) => c.slug === activeChannelSlug) ?? channels[0];
  const [messages, setMessages] = useState<RailMessage[]>(initialMessages);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const membersById = Object.fromEntries(members.map((m) => [m.id, m]));

  useEffect(() => {
    if (!activeChannel) return;
    const ch = supabase
      .channel(`rail:${activeChannel.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${activeChannel.id}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            author_id: string;
            body: string;
            created_at: string;
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [
              ...prev,
              {
                id: row.id,
                author_id: row.author_id,
                body: row.body,
                created_at: row.created_at,
                author: membersById[row.author_id] ?? null,
              },
            ].slice(-50);
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [activeChannel, supabase, membersById]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || !activeChannel) return;
    setPending(true);
    setDraft("");
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: activeChannel.id, body: trimmed }),
      });
      if (!res.ok) {
        setDraft(trimmed);
      }
    } finally {
      setPending(false);
    }
  }

  const online = members.filter((m) => m.status === "online");

  return (
    <aside className="relative z-10 w-[320px] shrink-0 flex flex-col gap-4 p-4 border-l border-white/5 bg-[color:var(--color-panel)]/70 backdrop-blur-md h-[calc(100vh)] sticky top-0">
      <div className="surface flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="eyebrow">Team Chat</div>
          <Link href={`/chat/${activeChannelSlug}`} className="btn-ghost !px-2 !py-1">
            <Plus className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="flex flex-col gap-0.5 px-2 py-2 border-b border-white/5">
          {channels.map((c) => {
            const active = c.slug === activeChannelSlug;
            return (
              <Link
                key={c.id}
                href={`/chat/${c.slug}`}
                className={cn(
                  "flex items-center justify-between px-2 py-1.5 rounded-md text-sm",
                  active
                    ? "bg-[color:var(--accent-dim)] text-[color:var(--accent)]"
                    : "text-[color:var(--color-muted)] hover:text-[color:var(--color-text)] hover:bg-white/[0.03]",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 opacity-80" />
                  {c.name}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-slim px-4 py-3 flex flex-col gap-3">
          {messages.length === 0 ? (
            <p className="text-xs text-[color:var(--color-muted)] mt-8 text-center">
              No messages yet. Say hi.
            </p>
          ) : (
            messages.map((m) => {
              const a = m.author;
              return (
                <div key={m.id} className="flex items-start gap-2">
                  <Avatar className="h-7 w-7 mt-0.5">
                    {a?.avatar_url ? <AvatarImage src={a.avatar_url} alt={a.display_name ?? ""} /> : null}
                    <AvatarFallback>{initials(a?.display_name ?? a?.email ?? "")}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold truncate max-w-[120px]">
                        {a?.display_name ?? a?.email?.split("@")[0] ?? "—"}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-[color:var(--color-muted)]">
                        {relativeTime(m.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-[color:var(--color-text)]/90 leading-snug break-words">
                      {m.body}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className="border-t border-white/5 p-2 flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={!activeChannel || pending}
            placeholder={`Message #${activeChannel?.name ?? "general"}`}
            className="flex-1 h-9 rounded-md bg-white/[0.03] border border-white/10 px-2.5 text-sm placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--accent-soft)]"
          />
          <button
            type="submit"
            disabled={!draft.trim() || pending}
            aria-label="Send"
            className="h-9 w-9 grid place-items-center rounded-md bg-[color:var(--accent)] text-black disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        {/* Suppress unused var lint in dev */}
        <span className="hidden">{teamId}{currentUserId}</span>
      </div>

      <div className="surface p-4">
        <div className="eyebrow">Online ({online.length})</div>
        <div className="mt-3 flex flex-col gap-2">
          {online.length === 0 ? (
            <p className="text-xs text-[color:var(--color-muted)]">No teammates online right now.</p>
          ) : (
            online.slice(0, 6).map((m) => (
              <div key={m.id} className="flex items-center gap-2.5">
                <Avatar className="h-7 w-7">
                  {m.avatar_url ? <AvatarImage src={m.avatar_url} alt={m.display_name ?? ""} /> : null}
                  <AvatarFallback>{initials(m.display_name ?? m.email)}</AvatarFallback>
                </Avatar>
                <div className="leading-tight flex-1 min-w-0">
                  <div className="text-sm truncate">{m.display_name ?? m.email.split("@")[0]}</div>
                  <div className="text-[10px] uppercase tracking-widest text-green-400">Online</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
