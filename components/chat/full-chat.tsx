"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Hash, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn, initials, relativeTime } from "@/lib/utils";
import type { UserRow } from "@/types/domain";

interface Channel {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

interface Message {
  id: string;
  channel_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

interface Props {
  channels: Channel[];
  activeSlug: string;
  members: Array<Pick<UserRow, "id" | "display_name" | "email" | "avatar_url" | "status">>;
  initialMessages: Message[];
  currentUserId: string;
}

export function FullChat({
  channels,
  activeSlug,
  members,
  initialMessages,
  currentUserId,
}: Props) {
  const supabaseRef = useRef(createSupabaseBrowserClient());
  const active = channels.find((c) => c.slug === activeSlug) ?? channels[0];
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const membersById = Object.fromEntries(members.map((m) => [m.id, m]));

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (!active) return;
    document.cookie = `active_channel=${encodeURIComponent(active.slug)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.dispatchEvent(
      new CustomEvent("active-channel-change", { detail: active.slug }),
    );
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const ch = supabaseRef.current
      .channel(`full:${active.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${active.id}`,
        },
        (payload) => {
          const row = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        },
      )
      .subscribe();
    return () => {
      void supabaseRef.current.removeChannel(ch);
    };
  }, [active]);

  useEffect(() => {
    requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      }
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !active) return;
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      channel_id: active.id,
      author_id: currentUserId,
      body,
      created_at: new Date().toISOString(),
    };
    setPending(true);
    setDraft("");
    setMessages((prev) => [...prev, optimisticMessage]);
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: active.id, body }),
      });

      const payload = (await res.json().catch(() => null)) as { data?: Message } | null;
      const confirmedMessage = payload?.data;

      if (!res.ok) {
        setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
        setDraft(body);
        return;
      }

      if (confirmedMessage) {
        setMessages((prev) => {
          const withoutOptimistic = prev.filter((message) => message.id !== optimisticId);
          if (withoutOptimistic.some((message) => message.id === confirmedMessage.id)) {
            return withoutOptimistic;
          }
          return [...withoutOptimistic, confirmedMessage];
        });
      }
    } catch {
      setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
      setDraft(body);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid grid-cols-[220px_1fr] gap-4 h-[calc(100vh-200px)] min-h-[500px]">
      <div className="surface p-3 flex flex-col">
        <div className="eyebrow px-2 pb-2">Channels</div>
        <div className="flex-1 flex flex-col gap-0.5">
          {channels.map((c) => {
            const isActive = c.slug === active?.slug;
            return (
              <Link
                key={c.id}
                href={`/chat/${c.slug}`}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm",
                  isActive
                    ? "bg-[color:var(--accent-dim)] text-[color:var(--accent)]"
                    : "text-[color:var(--color-muted)] hover:text-[color:var(--color-text)] hover:bg-white/[0.03]",
                )}
              >
                <Hash className="h-3.5 w-3.5 opacity-80" />
                {c.name}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="surface flex flex-col min-h-0">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-[color:var(--accent)]" />
            <h2 className="font-display text-lg tracking-wide">{active?.name}</h2>
          </div>
          {active?.description ? (
            <p className="text-xs text-[color:var(--color-muted)] mt-1">
              {active.description}
            </p>
          ) : null}
        </div>
        <div
          ref={viewportRef}
          className="flex-1 min-h-0 overflow-y-auto scrollbar-slim px-5 py-4 flex flex-col gap-3"
        >
          {messages.length === 0 ? (
            <p className="text-sm text-[color:var(--color-muted)] text-center mt-10">
              No messages yet. Kick it off.
            </p>
          ) : (
            messages.map((m) => {
              const author = membersById[m.author_id];
              const isMine = m.author_id === currentUserId;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex items-start gap-3",
                    isMine && "flex-row-reverse",
                  )}
                >
                  <Avatar className="h-8 w-8">
                    {author?.avatar_url ? (
                      <AvatarImage src={author.avatar_url} alt={author.display_name ?? ""} />
                    ) : null}
                    <AvatarFallback>
                      {initials(author?.display_name ?? author?.email ?? "")}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn("max-w-[60%]", isMine && "text-right")}>
                    <div
                      className={cn(
                        "flex items-baseline gap-2 text-xs text-[color:var(--color-muted)]",
                        isMine && "justify-end",
                      )}
                    >
                      <span className="font-semibold text-[color:var(--color-text)]">
                        {author?.display_name ?? author?.email?.split("@")[0] ?? "—"}
                      </span>
                      <span>{relativeTime(m.created_at)}</span>
                    </div>
                    <p
                      className={cn(
                        "mt-1 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-sm inline-block whitespace-pre-wrap break-words",
                        isMine && "bg-[color:var(--accent-dim)] border-[color:var(--accent-soft)]",
                      )}
                    >
                      {m.body}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className="border-t border-white/5 p-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={!active || pending}
            placeholder={`Message #${active?.name ?? "general"}`}
            className="flex-1 h-10 rounded-lg bg-white/[0.03] border border-white/10 px-3 text-sm placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--accent-soft)] focus:ring-2 focus:ring-[color:var(--accent-soft)]"
          />
          <button
            type="submit"
            disabled={!draft.trim() || pending}
            className="h-10 px-4 rounded-lg bg-[color:var(--accent)] text-black font-semibold disabled:opacity-40 inline-flex items-center gap-2"
          >
            <Send className="h-4 w-4" /> Send
          </button>
        </form>
      </div>
    </div>
  );
}
