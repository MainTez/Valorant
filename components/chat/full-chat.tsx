"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Hash, Pencil, Send, Trash2, X } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn, initials, relativeTime } from "@/lib/utils";
import type { Role, UserRow } from "@/types/domain";

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
  updated_at: string | null;
}

interface Props {
  channels: Channel[];
  activeSlug: string;
  members: Array<Pick<UserRow, "id" | "display_name" | "email" | "avatar_url" | "status">>;
  initialMessages: Message[];
  currentUserId: string;
  currentUserRole: Role;
}

export function FullChat({
  channels,
  activeSlug,
  members,
  initialMessages,
  currentUserId,
  currentUserRole,
}: Props) {
  const supabaseRef = useRef(createSupabaseBrowserClient());
  const messageChannelRef = useRef<RealtimeChannel | null>(null);
  const active = channels.find((c) => c.slug === activeSlug) ?? channels[0];
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [editDraft, setEditDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
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
    const supabase = supabaseRef.current;
    const ch = supabase
      .channel(`full:${active.id}`)
      .on("broadcast", { event: "message" }, ({ payload }) => {
        const row = payload as Message;
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      })
      .on("broadcast", { event: "message:update" }, ({ payload }) => {
        const row = payload as Message;
        setMessages((prev) => prev.map((message) => (message.id === row.id ? row : message)));
      })
      .on("broadcast", { event: "message:delete" }, ({ payload }) => {
        const row = payload as { id: string };
        setMessages((prev) => prev.filter((message) => message.id !== row.id));
      })
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
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${active.id}`,
        },
        (payload) => {
          const row = payload.new as Message;
          setMessages((prev) => prev.map((message) => (message.id === row.id ? row : message)));
        },
      )
      .subscribe();
    messageChannelRef.current = ch;
    return () => {
      if (messageChannelRef.current?.topic === ch.topic) {
        messageChannelRef.current = null;
      }
      void supabase.removeChannel(ch);
    };
  }, [active]);

  useEffect(() => {
    requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      }
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
      updated_at: null,
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
        void messageChannelRef.current?.send({
          type: "broadcast",
          event: "message",
          payload: confirmedMessage,
        });
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

  function startEditing(message: Message) {
    setEditingId(message.id);
    setEditDraft(message.body);
  }

  function stopEditing() {
    setEditingId(null);
    setEditDraft("");
  }

  async function saveEdit(message: Message) {
    const body = editDraft.trim();
    if (!body || body === message.body) {
      stopEditing();
      return;
    }

    setPending(true);
    try {
      const response = await fetch(`/api/chat/messages/${message.id}`, {
        body: JSON.stringify({ body }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = (await response.json().catch(() => ({}))) as { data?: Message; error?: string };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Failed to edit message.");
      }
      setMessages((prev) =>
        prev.map((current) => (current.id === payload.data?.id ? payload.data : current)),
      );
      void messageChannelRef.current?.send({
        type: "broadcast",
        event: "message:update",
        payload: payload.data,
      });
      stopEditing();
    } finally {
      setPending(false);
    }
  }

  async function deleteMessage(message: Message) {
    setPending(true);
    try {
      const response = await fetch(`/api/chat/messages/${message.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Failed to delete message.");
      }
      setMessages((prev) => prev.filter((current) => current.id !== message.id));
      void messageChannelRef.current?.send({
        type: "broadcast",
        event: "message:delete",
        payload: { id: message.id },
      });
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
              const canEdit = isMine && !m.id.startsWith("optimistic-");
              const canDelete =
                !m.id.startsWith("optimistic-") &&
                (isMine || currentUserRole === "admin");
              const isEditing = editingId === m.id;
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
                      {m.updated_at ? <span>edited</span> : null}
                    </div>
                    {isEditing ? (
                      <div className="mt-1 flex max-w-[32rem] items-center gap-2">
                        <input
                          value={editDraft}
                          onChange={(event) => setEditDraft(event.target.value)}
                          className="min-w-0 flex-1 rounded-xl border border-[color:var(--accent-soft)] bg-black/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-dim)]"
                          autoFocus
                        />
                        <button
                          type="button"
                          aria-label="Save edit"
                          onClick={() => void saveEdit(m)}
                          disabled={pending || !editDraft.trim()}
                          className="grid h-8 w-8 place-items-center rounded-lg bg-[color:var(--accent)] text-black disabled:opacity-40"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Cancel edit"
                          onClick={stopEditing}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-[color:var(--color-muted)] hover:text-[color:var(--color-text)]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className={cn("group mt-1 flex items-center gap-2", isMine && "justify-end")}>
                        <p
                          className={cn(
                            "rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-sm inline-block whitespace-pre-wrap break-words",
                            isMine && "bg-[color:var(--accent-dim)] border-[color:var(--accent-soft)]",
                          )}
                        >
                          {m.body}
                        </p>
                        {canEdit || canDelete ? (
                          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                            {canEdit ? (
                              <button
                                type="button"
                                aria-label="Edit message"
                                onClick={() => startEditing(m)}
                                className="grid h-7 w-7 place-items-center rounded-md text-[color:var(--color-muted)] hover:bg-white/[0.05] hover:text-[color:var(--color-text)]"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                            {canDelete ? (
                              <button
                                type="button"
                                aria-label="Delete message"
                                onClick={() => void deleteMessage(m)}
                                disabled={pending}
                                className="grid h-7 w-7 place-items-center rounded-md text-red-300 hover:bg-red-400/10 hover:text-red-100 disabled:opacity-40"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
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
