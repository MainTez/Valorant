"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Calendar,
  ClipboardList,
  LayoutDashboard,
  Film,
  LineChart,
  ListChecks,
  MessageSquare,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  Users,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeamSlug } from "@/lib/constants";
import { TEAMS } from "@/lib/constants";
import { TeamEmblem } from "@/components/common/team-emblem";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

interface Props {
  team: TeamSlug;
  user: {
    display_name: string | null;
    avatar_url: string | null;
    email: string;
    role: "player" | "coach" | "admin";
  };
}

function readActiveChannelSlug() {
  const matchedCookie = document.cookie.match(/(?:^|; )active_channel=([^;]+)/);
  return matchedCookie ? decodeURIComponent(matchedCookie[1]) : "general";
}

const NAV: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  matchPrefix?: string;
}> = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stats", label: "Stats Tracker", icon: LineChart },
  { href: "/insights", label: "AI Insights", icon: Sparkles },
  { href: "/matches", label: "Match Log", icon: Swords },
  { href: "/vods", label: "VOD Library", icon: Film },
  { href: "/routines", label: "Routines", icon: ListChecks },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/chat/general", label: "Team Chat", icon: MessageSquare, matchPrefix: "/chat" },
  { href: "/players", label: "Players", icon: Users },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/admin/whitelist", label: "Admin", icon: Shield, adminOnly: true },
];

export function Sidebar({ team, user }: Props) {
  const pathname = usePathname();
  const meta = TEAMS[team];
  const [chatHref, setChatHref] = useState("/chat/general");

  useEffect(() => {
    setChatHref(`/chat/${readActiveChannelSlug()}`);
  }, [pathname]);

  useEffect(() => {
    const handleActiveChannelChange = (event: Event) => {
      const nextSlug =
        (event as CustomEvent<string>).detail ?? readActiveChannelSlug();
      setChatHref(`/chat/${nextSlug}`);
    };

    window.addEventListener(
      "active-channel-change",
      handleActiveChannelChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        "active-channel-change",
        handleActiveChannelChange as EventListener,
      );
    };
  }, []);

  return (
    <aside className="relative z-10 flex min-h-screen w-[212px] shrink-0 flex-col gap-5 border-r border-white/6 bg-[linear-gradient(180deg,rgba(14,16,22,0.94)_0%,rgba(12,14,19,0.98)_100%)] px-4 py-5 backdrop-blur-xl">
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="rounded-[1.15rem] border border-[color:var(--accent-soft)] bg-[color:var(--accent-dim)] p-3 shadow-[0_0_26px_-14px_var(--accent)]">
          <TeamEmblem team={team} size="md" />
        </div>
        <div className="mt-1 text-center font-display text-base tracking-[0.34em] accent-text">
          {meta.shortName}
        </div>
      </div>

      <nav className="flex flex-col gap-1.5">
        {NAV.filter((n) => !n.adminOnly || user.role === "admin").map((n) => {
          const href = n.matchPrefix === "/chat" ? chatHref : n.href;
          const matchTarget = n.matchPrefix ?? n.href;
          const active =
            pathname === href ||
            (matchTarget !== "/dashboard" && pathname.startsWith(matchTarget));
          const Icon = n.icon;
          return (
            <Link
              key={n.label}
              href={href}
              className={cn("nav-item", active && "active")}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 pt-4">
        <div className="rounded-[1rem] border border-[color:var(--accent-soft)] bg-[linear-gradient(180deg,rgba(246,196,83,0.12),rgba(246,196,83,0.04))] px-4 py-3 shadow-[0_20px_40px_-32px_rgba(246,196,83,0.75)]">
          <div className="text-[0.66rem] uppercase tracking-[0.24em] text-white/42">
            Team Brief
          </div>
          <div className="mt-2 text-sm leading-6 text-white/74">
            {meta.motto ?? meta.name}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-[1rem] border border-white/7 bg-white/[0.02] p-3">
          <Avatar className="h-9 w-9">
            {user.avatar_url ? (
              <AvatarImage src={user.avatar_url} alt={user.display_name ?? user.email} />
            ) : null}
            <AvatarFallback>{initials(user.display_name ?? user.email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">
              {user.display_name ?? user.email.split("@")[0]}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-[color:var(--color-muted)]">
              {user.role}
            </div>
          </div>
          <Link href="/calendar" aria-label="Settings" className="text-[color:var(--color-muted)] hover:text-[color:var(--accent)]">
            <Settings className="h-4 w-4" />
          </Link>
        </div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-muted)] text-center">
          <ScrollText className="inline-block h-3 w-3 mr-1 -mt-0.5" />
          {meta.name}
        </div>
      </div>
    </aside>
  );
}
