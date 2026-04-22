"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronRight, Hash, PanelRightClose, PanelRightOpen, Send } from "lucide-react";
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
}

const MINIMIZED_STORAGE_KEY = "chat-rail-minimized";

function authorForMessage(members: MemberSummary[], authorId: string) {
  return members.find((member) => member.id === authorId) ?? null;
}

export function ChatRail({
  channels,
  members,
  activeChannelSlug,
  initialMessages,
  currentUserId,
}: Props) {
  const supabaseRef = useRef(createSupabaseBrowserClient());
  const rootRef = useRef<HTMLElement>(null);
  const onlineRef = useRef<HTMLDivElement>(null);
  const messageViewportRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hydratedChannelRef = useRef(false);

  const [selectedChannelSlug, setSelectedChannelSlug] = useState(activeChannelSlug);
  const [messages, setMessages] = useState<RailMessage[]>(initialMessages);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState("");
  const [minimized, setMinimized] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [loadingChannel, setLoadingChannel] = useState(false);

  const activeChannel = channels.find((channel) => channel.slug === selectedChannelSlug) ?? channels[0];
  const online = members.filter((member) => member.status === "online");

  useEffect(() => {
    setSelectedChannelSlug(activeChannelSlug);
    setMessages(initialMessages);
  }, [activeChannelSlug, initialMessages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setMinimized(window.localStorage.getItem(MINIMIZED_STORAGE_KEY) === "1");
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady || typeof window === "undefined") return;
    window.localStorage.setItem(MINIMIZED_STORAGE_KEY, minimized ? "1" : "0");
  }, [minimized, storageReady]);

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
            author: authorForMessage(members, message.author_id),
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
  }, [activeChannel, members]);

  useEffect(() => {
    if (!activeChannel) return;

    const channel = supabaseRef.current
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

          setMessages((previous) => {
            if (previous.some((message) => message.id === row.id)) return previous;

            return [
              ...previous,
              {
                id: row.id,
                author_id: row.author_id,
                body: row.body,
                created_at: row.created_at,
                author: authorForMessage(members, row.author_id),
              },
            ].slice(-50);
          });
        },
      )
      .subscribe();

    return () => {
      void supabaseRef.current.removeChannel(channel);
    };
  }, [activeChannel, members]);

  useEffect(() => {
    if (minimized) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, minimized]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!messageViewportRef.current || minimized) return;

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
  }, [activeChannel?.id, minimized]);

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

      const cleanups: Array<() => void> = [];
      const hoverNodes = gsap.utils.toArray<HTMLElement>("[data-hover-tilt]");

      hoverNodes.forEach((node) => {
        const xTo = gsap.quickTo(node, "x", { duration: 0.38, ease: "power3.out" });
        const yTo = gsap.quickTo(node, "y", { duration: 0.38, ease: "power3.out" });
        const rotateTo = gsap.quickTo(node, "rotation", {
          duration: 0.38,
          ease: "power3.out",
        });
        const scaleTo = gsap.quickTo(node, "scale", { duration: 0.38, ease: "power3.out" });

        const handleMove = (event: PointerEvent) => {
          const bounds = node.getBoundingClientRect();
          const offsetX = event.clientX - (bounds.left + bounds.width / 2);
          const offsetY = event.clientY - (bounds.top + bounds.height / 2);
          xTo(bounds.width > 0 ? offsetX * 0.025 : 0);
          yTo(bounds.height > 0 ? offsetY * 0.025 : 0);
          rotateTo(bounds.width > 0 ? offsetX * 0.02 : 0);
          scaleTo(1.01);
        };

        const resetNode = () => {
          xTo(0);
          yTo(0);
          rotateTo(0);
          scaleTo(1);
        };

        node.addEventListener("pointermove", handleMove);
        node.addEventListener("pointerleave", resetNode);
        node.addEventListener("pointercancel", resetNode);
        cleanups.push(() => {
          node.removeEventListener("pointermove", handleMove);
          node.removeEventListener("pointerleave", resetNode);
          node.removeEventListener("pointercancel", resetNode);
        });
      });

      if (onlineRef.current) {
        gsap.to("[data-online-card]", {
          y: (index) => -index * 8,
          scale: (index) => 1 - index * 0.025,
          opacity: (index) => 1 - Math.min(index * 0.05, 0.18),
          ease: "none",
          stagger: 0.04,
          scrollTrigger: {
            trigger: onlineRef.current,
            start: "top bottom-=120",
            end: "bottom center",
            scrub: 0.6,
          },
        });
      }

      return () => {
        cleanups.forEach((cleanup) => cleanup());
      };
    },
    { scope: rootRef, dependencies: [online.length], revertOnUpdate: true },
  );

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || !activeChannel) return;

    setPending(true);
    setDraft("");

    try {
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: activeChannel.id, body: trimmed }),
      });

      if (!response.ok) {
        setDraft(trimmed);
      }
    } finally {
      setPending(false);
    }
  }

  function selectChannel(slug: string) {
    if (slug === activeChannel?.slug) return;
    setSelectedChannelSlug(slug);
  }

  return (
    <aside
      ref={rootRef}
      className="relative z-10 flex h-[calc(100vh)] w-[320px] shrink-0 flex-col gap-4 border-l border-white/5 bg-[color:var(--color-panel)]/70 p-4 backdrop-blur-md"
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
                      <AvatarImage src={member.avatar_url} alt={member.display_name ?? member.email} />
                    ) : null}
                    <AvatarFallback>{initials(member.display_name ?? member.email)}</AvatarFallback>
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
            onClick={() => setMinimized((current) => !current)}
            aria-label={minimized ? "Expand sidebar chat" : "Minimize sidebar chat"}
            className="btn-ghost !h-9 !w-9 !px-0 !py-0"
          >
            {minimized ? (
              <PanelRightOpen className="h-4 w-4" />
            ) : (
              <PanelRightClose className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="relative flex flex-1 min-h-0 flex-col">
          <div
            className={cn(
              "border-b border-white/5 transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)]",
              minimized ? "grid grid-cols-2 grid-flow-dense gap-2 px-3 py-3" : "flex flex-col gap-1 px-2 py-3",
            )}
          >
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
                    "group relative overflow-hidden rounded-xl border text-left transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)]",
                    minimized ? "min-h-11 px-3 py-2" : "px-3 py-2.5",
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
                      <span className="block truncate text-sm font-medium">{channel.name}</span>
                      <span
                        className={cn(
                          "block overflow-hidden text-[10px] uppercase tracking-[0.22em] transition-all duration-500",
                          minimized
                            ? "max-w-0 opacity-0 group-hover:max-w-[7rem] group-hover:opacity-100"
                            : "max-w-[8rem] opacity-100",
                        )}
                      >
                        {isActive ? "Live Thread" : "Switch Feed"}
                      </span>
                    </span>

                    {!minimized ? (
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform duration-300",
                          isActive
                            ? "translate-x-0 text-[color:var(--accent)]"
                            : "translate-x-0 text-[color:var(--color-muted)] group-hover:translate-x-0.5",
                        )}
                      />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            className={cn(
              "grid min-h-0 transition-[grid-template-rows,opacity,margin] duration-500 ease-[cubic-bezier(.22,1,.36,1)]",
              minimized ? "mt-0 grid-rows-[0fr] opacity-0" : "mt-1 flex-1 grid-rows-[1fr] opacity-100",
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="flex h-full min-h-0 flex-col">
                <div
                  ref={messageViewportRef}
                  className="relative flex-1 min-h-0 overflow-y-auto px-4 py-3 scrollbar-slim"
                >
                  <div className="flex min-h-full flex-col gap-3">
                    {loadingChannel ? (
                      <div className="mt-6 flex flex-col gap-2.5">
                        <div className="h-11 rounded-2xl border border-white/5 bg-white/[0.03] animate-pulse" />
                        <div className="h-14 rounded-2xl border border-white/5 bg-white/[0.025] animate-pulse" />
                        <div className="h-10 rounded-2xl border border-white/5 bg-white/[0.03] animate-pulse" />
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
                                  <AvatarImage src={author.avatar_url} alt={author.display_name ?? author.email} />
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
                                    {author?.display_name ?? author?.email?.split("@")[0] ?? "—"}
                                  </span>
                                  <span>{relativeTime(message.created_at)}</span>
                                </div>

                                <p
                                  className={cn(
                                    "inline-flex rounded-2xl border px-3 py-2 text-sm leading-snug shadow-[0_20px_40px_-32px_rgba(0,0,0,0.95)] break-words whitespace-pre-wrap",
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

                    <div ref={bottomRef} />
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

      <div
        ref={onlineRef}
        data-rail-shell
        className="surface relative overflow-hidden p-4"
      >
        <div className="pointer-events-none absolute inset-x-6 top-0 h-16 bg-[radial-gradient(circle_at_top,var(--accent-dim),transparent_72%)] opacity-70" />

        <div className="relative flex items-center justify-between">
          <div className="eyebrow">Online ({online.length})</div>
          <span className="animate-pulse-glow h-2 w-2 rounded-full bg-green-400" />
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
                      <AvatarImage src={member.avatar_url} alt={member.display_name ?? member.email} />
                    ) : null}
                    <AvatarFallback>{initials(member.display_name ?? member.email)}</AvatarFallback>
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
    </aside>
  );
}
