"use client";

import { Bell, Calendar as CalendarIcon, ChevronDown, LogOut, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  user: {
    display_name: string | null;
    avatar_url: string | null;
    email: string;
    role: "player" | "coach" | "admin";
  };
  teamName: string;
}

export function Topbar({ user, teamName }: Props) {
  const router = useRouter();

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 px-6 py-4 border-b border-white/5 bg-[color:var(--color-bg)]/70 backdrop-blur-md">
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--color-muted)]" />
          <input
            type="search"
            placeholder="Search players, matches, notes…"
            className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.025] pl-10 pr-16 text-sm placeholder:text-[color:var(--color-muted)] transition-colors hover:border-white/15 focus:border-[color:var(--accent-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 kbd">⌘K</span>
        </div>
      </div>

      <button
        aria-label="Notifications"
        className="h-10 w-10 grid place-items-center rounded-lg border border-white/10 bg-white/[0.025] text-[color:var(--color-muted)] hover:text-[color:var(--accent)] hover:border-[color:var(--accent-soft)] transition"
      >
        <Bell className="h-[18px] w-[18px]" />
      </button>

      <Link
        href="/calendar"
        aria-label="Calendar"
        className="h-10 w-10 grid place-items-center rounded-lg border border-white/10 bg-white/[0.025] text-[color:var(--color-muted)] hover:text-[color:var(--accent)] hover:border-[color:var(--accent-soft)] transition"
      >
        <CalendarIcon className="h-[18px] w-[18px]" />
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 hover:border-[color:var(--accent-soft)] transition">
          <Avatar className="h-8 w-8">
            {user.avatar_url ? (
              <AvatarImage src={user.avatar_url} alt={user.display_name ?? user.email} />
            ) : null}
            <AvatarFallback>{initials(user.display_name ?? user.email)}</AvatarFallback>
          </Avatar>
          <div className="text-left leading-tight hidden sm:block">
            <div className="text-sm font-semibold">
              {user.display_name ?? user.email.split("@")[0]}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-[color:var(--color-muted)]">
              {user.role} · {teamName}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-[color:var(--color-muted)]" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
          <div className="px-3 pb-1 text-sm truncate">{user.email}</div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => router.push("/players")}>
            Players
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push("/calendar")}>
            Calendar
          </DropdownMenuItem>
          {user.role === "admin" ? (
            <DropdownMenuItem onSelect={() => router.push("/admin/whitelist")}>
              Admin
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
