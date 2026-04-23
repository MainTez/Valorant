"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronRight, Hash, PanelRightClose, PanelRightOpen, Send } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials, relativeTime } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

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

const DRAWER_HIDDEN_STORAGE_KEY = "chat-rail-hidden";
const LEGACY_DRAWER_STORAGE_KEY = "chat-rail-minimized";
const DRAWER_VISIBLE_HANDLE = 44;

function authorForMessage(members: MemberSummary[], authorId: string) {
  return members.find((member) => member.id === authorId) ?? null;
}

export function ChatRail({
  channels,
  members,
  activeChannelSlug,
  initialMessages,
  currentUserId,
  teamId,
}: Props) {
  const supabaseRef = useRef(createSupabaseBrowserClient());
  const messageChannelRef = useRef<RealtimeChannel | null>(null);
  const membersRef = useRef(members);
  const rootRef = useRef<HTMLDivElement>(null);
  const drawerPanelRef = useRef<HTMLElement>(null);
  const messageViewportRef = useRef<HTMLDivElement>(null);
  const hydratedChannelRef = useRef(false);

  const [selectedChannelSlug, setSelectedChannelSlug] = useState(activeChannelSlug);
  const [messages, setMessages] = useState<RailMessage[]>(initialMessages);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState("");
  const [railHidden, setRailHidden] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [loadingChannel, setLoadingChannel] = useState(false);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);

  const activeChannel =
    channels.find((channel) => channel.slug === selectedChannelSlug) ?? channels[0];
  const onlineIdSet = new Set(onlineIds);
  const online = members.filter(
    (member) => onlineIdSet.has(member.id) || member.status === "online",
  );

  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  useEffect(() => {
    setSelectedChannelSlug(activeChannelSlug);
    setMessages(initialMessages);
  }, [activeChannelSlug, initialMessages]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedHidden = window.localStorage.getItem(DRAWER_HIDDEN_STORAGE_KEY);
    const storedLegacy = window.localStorage.getItem(LEGACY_DRAWER_STORAGE_KEY);
    setRailHidden(storedHidden === "1" || (storedHidden === null && storedLegacy === "1"));
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady || typeof window === "undefined") return;

    window.localStorage.setItem(DRAWER_HIDDEN_STORAGE_KEY, railHidden ? "1" : "0");
    window.localStorage.removeItem(LEGACY_DRAWER_STORAGE_KEY);
  }, [railHidden, storageReady]);

  useEffect(() => {
    if (!activeChannel) return;

    document.cookie = `active_channel=${encodeURIComponent(activeChannel.slug)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.dispatchEvent(
      new CustomEvent("active-channel-change", { detail: activeChannel.slug }),
    );
    setDraft("");
  }, [activeChannel]);

  useEffect(() => {
    if (!activeChannel) return;
    if (!hydratedChannelRef.current) {
      hydratedChannelRef.current = true;
      return;
    }

    let cancelled = false;

    async function loadMessages() {
      setLoadingChannel(true);

      try {
        const { data } = await supabaseRef.current
          .from("chat_messages")
          .select("id, author_id, body, created_at")
          .eq("channel_id", activeChannel.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (cancelled) return;

        const nextMessages = (data ?? [])
          .slice()
          .reverse()
          .map((message) => ({
            id: message.id,
            author_id: message.author_id,
            body: message.body,
            created_at: message.created_at,
            author: authorForMessage(membersRef.current, message.author_id),
          }));

        setMessages(nextMessages);
      } finally {
        if (!cancelled) {
          setLoadingChannel(false);
        }
      }
    }

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [activeChannel]);

  useEffect(() => {
    if (!teamId) return;

    const supabase = supabaseRef.current;
    const presenceChannel = supabase.channel(`presence:team:${teamId}`, {
      config: {
        presence: { key: currentUserId },
      },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState<{ user_id: string }>();
        const ids = Object.values(state)
          .flatMap((entries) => entries.map((entry) => entry.user_id))
          .filter(Boolean);

        setOnlineIds(Array.from(new Set(ids)));
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        setOnlineIds((previous) =>
          previous.includes(currentUserId) ? previous : [...previous, currentUserId],
        );
        await presenceChannel.track({
          user_id: currentUserId,
          online_at: new Date().toISOString(),
        });
      });

    return () => {
      void supabase.removeChannel(presenceChannel);
    };
  }, [currentUserId, teamId]);

  useEffect(() => {
    if (!activeChannel) return;

    const supabase = supabaseRef.current;
    const subscription = supabase
      .channel(`rail:${activeChannel.id}`)
      .on("broadcast", { event: "message" }, ({ payload }) => {
        const row = payload as {
          id: string;
          author_id: string;
          body: string;
          created_at: string;
        };

        setMessages((previous) => {
          if (previous.some((message) => message.id === row.id)) return previous;

          return [
            ...previous,
            {
              id: row.id,
              author_id: row.author_id,
              body: row.body,
              created_at: row.created_at,
              author: authorForMessage(membersRef.current, row.author_id),
            },
          ].slice(-50);
        });
      })
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

          setMessages((previous) => {
            if (previous.some((message) => message.id === row.id)) return previous;

            return [
              ...previous,
              {
                id: row.id,
                author_id: row.author_id,
                body: row.body,
                created_at: row.created_at,
                author: authorForMessage(membersRef.current, row.author_id),
              },
            ].slice(-50);
          });
        },
      )
      .subscribe();
    messageChannelRef.current = subscription;

    return () => {
      if (messageChannelRef.current?.topic === subscription.topic) {
        messageChannelRef.current = null;
      }
      void supabase.removeChannel(subscription);
    };
  }, [activeChannel]);

  useEffect(() => {
    if (railHidden) return;

    const behavior: ScrollBehavior = activeChannel ? "auto" : "smooth";
    requestAnimationFrame(() => {
      const viewport = messageViewportRef.current;
      if (!viewport) return;
      viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    });
  }, [messages.length, railHidden, activeChannel]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!messageViewportRef.current || railHidden) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        messageViewportRef.current,
        { autoAlpha: 0.45, y: 12 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.42,
          ease: "power3.out",
        },
      );
    }, messageViewportRef.current);

    return () => ctx.revert();
  }, [activeChannel?.id, railHidden]);

  useEffect(() => {
    if (!storageReady || !drawerPanelRef.current) return;

    const drawerPanel = drawerPanelRef.current;
    const travel = Math.max(drawerPanel.offsetWidth - DRAWER_VISIBLE_HANDLE, 0);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      gsap.set(drawerPanel, { x: railHidden ? travel : 0 });
      return;
    }

    const tween = gsap.to(drawerPanel, {
      x: railHidden ? travel : 0,
      duration: 0.56,
      ease: "power3.inOut",
    });

    return () => {
      tween.kill();
    };
  }, [railHidden, storageReady]);

  useGSAP(
    () => {
      if (typeof window === "undefined") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
      intro
        .from("[data-rail-shell]", {
          y: 26,
          opacity: 0,
          duration: 0.82,
          stagger: 0.1,
        })
        .from(
          "[data-channel-button]",
          {
            y: 16,
            opacity: 0,
            duration: 0.55,
            stagger: 0.05,
          },
          "-=0.48",
        )
        .from(
          "[data-online-card]",
          {
            y: 18,
            opacity: 0,
            duration: 0.5,
            stagger: 0.05,
          },
          "-=0.34",
        );

      return () => undefined;
    },
    { scope: rootRef },
  );

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || !activeChannel) return;

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: RailMessage = {
      id: optimisticId,
      author_id: currentUserId,
      body: trimmed,
      created_at: new Date().toISOString(),
      author: authorForMessage(members, currentUserId),
    };

    setPending(true);
    setDraft("");
    setMessages((previous) => [...previous, optimisticMessage].slice(-50));

    try {
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: activeChannel.id, body: trimmed }),
      });

      const payload = (await response.json().catch(() => null)) as {
        data?: {
          id: string;
          author_id: string;
          body: string;
          created_at: string;
        };
      } | null;
      const confirmedMessage = payload?.data;

      if (!response.ok) {
        setMessages((previous) =>
          previous.filter((message) => message.id !== optimisticId),
        );
        setDraft(trimmed);
        return;
      }

      if (confirmedMessage) {
        void messageChannelRef.current?.send({
          type: "broadcast",
          event: "message",
          payload: confirmedMessage,
        });
        setMessages((previous) => {
          const withoutOptimistic = previous.filter(
            (message) => message.id !== optimisticId,
          );

          if (withoutOptimistic.some((message) => message.id === confirmedMessage.id)) {
            return withoutOptimistic;
          }

          return [
            ...withoutOptimistic,
            {
              id: confirmedMessage.id,
              author_id: confirmedMessage.author_id,
              body: confirmedMessage.body,
              created_at: confirmedMessage.created_at,
              author: authorForMessage(members, confirmedMessage.author_id),
            },
          ].slice(-50);
        });
      }
    } catch {
      setMessages((previous) =>
        previous.filter((message) => message.id !== optimisticId),
      );
      setDraft(trimmed);
    } finally {
      setPending(false);
    }
  }

  function selectChannel(slug: string) {
    if (slug === activeChannel?.slug) return;
    setSelectedChannelSlug(slug);
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative z-10 h-[calc(100vh)] shrink-0 overflow-visible transition-[width] duration-500 ease-[cubic-bezier(.22,1,.36,1)]",
        railHidden ? "w-10" : "w-[320px]",
      )}
    >
      <aside
        ref={drawerPanelRef}
        className="absolute inset-y-0 right-0 flex h-full w-[320px] flex-col gap-4 border-l border-white/5 bg-[color:var(--color-panel)]/70 p-4 backdrop-blur-md will-change-transform"
      >
        <button
          type="button"
          data-hover-tilt
          onClick={() => setRailHidden(false)}
          aria-label="Show team chat"
          className={cn(
            "absolute left-0 top-1/2 z-30 flex h-16 w-11 -translate-y-1/2 items-center justify-center rounded-l-2xl border border-white/10 bg-[color:var(--color-card-solid)]/92 shadow-[0_24px_50px_-32px_rgba(0,0,0,0.95)] backdrop-blur-md transition-all duration-300",
            railHidden
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0",
          )}
        >
          <div className="flex flex-col items-center gap-1">
            <PanelRightOpen className="h-4 w-4 text-[color:var(--accent)]" />
            <span className="text-[9px] uppercase tracking-[0.22em] text-[color:var(--color-text)]">
              Chat
            </span>
          </div>
        </button>

        <div
          className={cn(
            "flex h-full min-h-0 flex-col gap-4 transition-opacity duration-300",
            railHidden ? "pointer-events-none opacity-100" : "pointer-events-auto opacity-100",
          )}
        >
          <div
            data-rail-shell
            className="surface relative flex flex-1 min-h-0 flex-col overflow-hidden"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,var(--accent-dim),transparent_72%)] opacity-80" />

            <div
              data-rail-header
              className="relative flex items-start justify-between gap-3 border-b border-white/5 p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="eyebrow">Team Chat</div>
                  <div className="flex -space-x-2">
                    {online.slice(0, 3).map((member) => (
                      <Avatar
                        key={member.id}
                        className="h-6 w-6 border border-[color:var(--color-card-solid)]"
                      >
                        {member.avatar_url ? (
                          <AvatarImage
                            src={member.avatar_url}
                            alt={member.display_name ?? member.email}
                          />
                        ) : null}
                        <AvatarFallback>
                          {initials(member.display_name ?? member.email)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <h2 className="max-w-[11rem] font-display text-lg leading-none tracking-[0.06em]">
                    #{activeChannel?.name ?? "general"}
                  </h2>
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)] shadow-[0_0_14px_var(--accent)]" />
                </div>
              </div>

              <button
                type="button"
                data-hover-tilt
                onClick={() => setRailHidden(true)}
                aria-label="Hide team chat"
                className="btn-ghost !h-9 !w-9 !px-0 !py-0"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            </div>

            <div className="relative flex flex-1 min-h-0 flex-col">
              <div className="border-b border-white/5 px-2 py-3">
                <div className="flex flex-col gap-1">
                  {channels.map((channel) => {
                    const isActive = channel.slug === activeChannel?.slug;

                    return (
                      <button
                        key={channel.id}
                        type="button"
                        data-channel-button
                        data-hover-tilt
                        onClick={() => selectChannel(channel.slug)}
                        className={cn(
                          "group relative overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)]",
                          isActive
                            ? "border-[color:var(--accent-soft)] bg-[linear-gradient(90deg,var(--accent-dim),transparent_90%)] text-[color:var(--color-text)] shadow-[0_18px_34px_-28px_var(--accent-soft)]"
                            : "border-white/6 bg-white/[0.02] text-[color:var(--color-muted)] hover:border-white/12 hover:bg-white/[0.045] hover:text-[color:var(--color-text)]",
                        )}
                      >
                        <span className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-[radial-gradient(circle_at_left,var(--accent-dim),transparent_72%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                        <span className="relative flex items-center gap-2.5">
                          <span
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
                              isActive
                                ? "border-[color:var(--accent-soft)] bg-[color:var(--accent-dim)] text-[color:var(--accent)]"
                                : "border-white/10 bg-black/20 text-[color:var(--color-muted)]",
                            )}
                          >
                            <Hash className="h-3.5 w-3.5" />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {channel.name}
                            </span>
                            <span className="block max-w-[8rem] overflow-hidden text-[10px] uppercase tracking-[0.22em] opacity-100 transition-all duration-500">
                              {isActive ? "Live Thread" : "Switch Feed"}
                            </span>
                          </span>

                          <ChevronRight
                            className={cn(
                              "h-4 w-4 shrink-0 transition-transform duration-300",
                              isActive
                                ? "translate-x-0 text-[color:var(--accent)]"
                                : "translate-x-0 text-[color:var(--color-muted)] group-hover:translate-x-0.5",
                            )}
                          />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-1 grid min-h-0 flex-1 grid-rows-[1fr]">
                <div className="min-h-0 overflow-hidden">
                  <div className="flex h-full min-h-0 flex-col">
                    <div
                      ref={messageViewportRef}
                      className="relative flex-1 min-h-0 overflow-y-auto px-4 py-3 scrollbar-slim"
                    >
                      <div className="flex min-h-full flex-col gap-3">
                        {loadingChannel ? (
                          <div className="mt-6 flex flex-col gap-2.5">
                            <div className="h-11 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
                            <div className="h-14 animate-pulse rounded-2xl border border-white/5 bg-white/[0.025]" />
                            <div className="h-10 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
                          </div>
                        ) : null}

                        {!loadingChannel && messages.length === 0 ? (
                          <p className="mt-8 text-center text-xs text-[color:var(--color-muted)]">
                            No messages yet. Say hi.
                          </p>
                        ) : null}

                        {!loadingChannel
                          ? messages.map((message) => {
                              const author = message.author;
                              const isMine = message.author_id === currentUserId;

                              return (
                                <div
                                  key={message.id}
                                  data-rail-message
                                  className={cn(
                                    "flex items-end gap-2.5",
                                    isMine && "flex-row-reverse",
                                  )}
                                >
                                  <Avatar className="h-7 w-7 shrink-0">
                                    {author?.avatar_url ? (
                                      <AvatarImage
                                        src={author.avatar_url}
                                        alt={author.display_name ?? author.email}
                                      />
                                    ) : null}
                                    <AvatarFallback>
                                      {initials(author?.display_name ?? author?.email ?? "")}
                                    </AvatarFallback>
                                  </Avatar>

                                  <div className={cn("max-w-[84%]", isMine && "text-right")}>
                                    <div
                                      className={cn(
                                        "mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-muted)]",
                                        isMine && "justify-end",
                                      )}
                                    >
                                      <span className="truncate font-semibold text-[color:var(--color-text)]">
                                        {author?.display_name ??
                                          author?.email?.split("@")[0] ??
                                          "—"}
                                      </span>
                                      <span>{relativeTime(message.created_at)}</span>
                                    </div>

                                    <p
                                      className={cn(
                                        "inline-flex whitespace-pre-wrap break-words rounded-2xl border px-3 py-2 text-sm leading-snug shadow-[0_20px_40px_-32px_rgba(0,0,0,0.95)]",
                                        isMine
                                          ? "border-[color:var(--accent-soft)] bg-[linear-gradient(180deg,var(--accent-dim),rgba(255,255,255,0.02))] text-[color:var(--color-text)]"
                                          : "border-white/8 bg-white/[0.03] text-[color:var(--color-text)]/92",
                                      )}
                                    >
                                      {message.body}
                                    </p>
                                  </div>
                                </div>
                              );
                            })
                          : null}

                      </div>
                    </div>

                    <form onSubmit={send} className="border-t border-white/5 p-2.5">
                      <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-black/20 p-1.5 backdrop-blur-sm">
                        <input
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          disabled={!activeChannel || pending}
                          placeholder={`Message #${activeChannel?.name ?? "general"}`}
                          className="h-10 flex-1 bg-transparent px-2.5 text-sm placeholder:text-[color:var(--color-muted)] focus:outline-none"
                        />
                        <button
                          type="submit"
                          data-hover-tilt
                          disabled={!draft.trim() || pending}
                          aria-label="Send"
                          className="grid h-10 w-10 place-items-center rounded-xl bg-[color:var(--accent)] text-black shadow-[0_12px_28px_-18px_var(--accent)] transition-transform duration-300 disabled:opacity-40"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div data-rail-shell className="surface relative overflow-hidden p-4">
            <div className="pointer-events-none absolute inset-x-6 top-0 h-16 bg-[radial-gradient(circle_at_top,var(--accent-dim),transparent_72%)] opacity-70" />

            <div className="relative flex items-center justify-between">
              <div className="eyebrow">Online ({online.length})</div>
              <span className="h-2 w-2 animate-pulse-glow rounded-full bg-green-400" />
            </div>

            <div className="relative mt-3 flex flex-col gap-2.5">
              {online.length === 0 ? (
                <p className="text-xs text-[color:var(--color-muted)]">
                  No teammates online right now.
                </p>
              ) : (
                online.slice(0, 6).map((member) => (
                  <div
                    key={member.id}
                    data-online-card
                    data-hover-tilt
                    className="relative rounded-xl border border-white/6 bg-white/[0.03] px-3 py-2.5 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8">
                        {member.avatar_url ? (
                          <AvatarImage
                            src={member.avatar_url}
                            alt={member.display_name ?? member.email}
                          />
                        ) : null}
                        <AvatarFallback>
                          {initials(member.display_name ?? member.email)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1 leading-tight">
                        <div className="truncate text-sm font-medium">
                          {member.display_name ?? member.email.split("@")[0]}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-green-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                          Online
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
