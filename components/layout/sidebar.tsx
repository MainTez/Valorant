"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  ClipboardList,
  LayoutDashboard,
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

const NAV: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}> = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stats", label: "Stats Tracker", icon: LineChart },
  { href: "/insights", label: "AI Insights", icon: Sparkles },
  { href: "/matches", label: "Match Log", icon: Swords },
  { href: "/routines", label: "Routines", icon: ListChecks },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/chat/general", label: "Team Chat", icon: MessageSquare },
  { href: "/players", label: "Players", icon: Users },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/admin/whitelist", label: "Admin", icon: Shield, adminOnly: true },
];

export function Sidebar({ team, user }: Props) {
  const pathname = usePathname();
  const meta = TEAMS[team];

  return (
    <aside className="relative z-10 w-[260px] shrink-0 flex flex-col gap-4 p-5 pr-3 border-r border-white/5 bg-[color:var(--color-panel)]/70 backdrop-blur-md min-h-screen sticky top-0">
      <div className="flex flex-col items-center gap-2 py-3">
        <TeamEmblem team={team} size="md" />
        <div className="text-center leading-tight mt-1">
          <div className="font-display tracking-[0.25em] text-base">NEXUS</div>
          <div className="font-display tracking-[0.22em] text-xs accent-text">
            {meta.shortName}
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.filter((n) => !n.adminOnly || user.role === "admin").map((n) => {
          const active =
            pathname === n.href ||
            (n.href !== "/dashboard" && pathname.startsWith(n.href));
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn("nav-item", active && "active")}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-5 border-t border-white/5">
        <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
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
        <div className="mt-3 text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-muted)] text-center">
          <ScrollText className="inline-block h-3 w-3 mr-1 -mt-0.5" />
          {meta.name}
        </div>
      </div>
    </aside>
  );
}
