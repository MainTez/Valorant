import Link from "next/link";
import { Minus, Swords, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials, relativeTime } from "@/lib/utils";
import type { MatchMomentRow, PlayerProfileRow, UserRow } from "@/types/domain";

export type RecentPlayerGameMoment = MatchMomentRow & {
  actor?: Pick<UserRow, "id" | "display_name" | "email" | "avatar_url"> | null;
  profile?: Pick<PlayerProfileRow, "id" | "riot_name" | "riot_tag" | "region"> | null;
};

const OUTCOME_META = {
  win: {
    verb: "WON",
    label: "Win",
    icon: Trophy,
    className: "border-emerald-400/35 bg-emerald-400/10 text-emerald-300",
  },
  loss: {
    verb: "LOST",
    label: "Loss",
    icon: Swords,
    className: "border-red-400/35 bg-red-400/10 text-red-300",
  },
  draw: {
    verb: "DREW",
    label: "Draw",
    icon: Minus,
    className: "border-white/14 bg-white/[0.04] text-white/70",
  },
} as const;

export function RecentPlayerGames({ moments }: { moments: RecentPlayerGameMoment[] }) {
  return (
    <div className="surface h-full p-5">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Recent Games</span>
        <Link href="/desktop" className="text-xs accent-text hover:underline">
          Live feed
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {moments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-[color:var(--color-muted)]">
            No synced player games yet.
          </div>
        ) : (
          moments.slice(0, 6).map((moment) => (
            <RecentGameRow key={moment.id} moment={moment} />
          ))
        )}
      </div>
    </div>
  );
}

function RecentGameRow({ moment }: { moment: RecentPlayerGameMoment }) {
  const outcome = outcomeForMoment(moment);
  const meta = OUTCOME_META[outcome];
  const Icon = meta.icon;
  const playerName = playerNameForMoment(moment);
  const stats = moment.stats as {
    kda?: string;
    acs?: number | null;
    score?: string;
  };
  const href = matchHref(moment);

  return (
    <Link
      href={href}
      className="group flex min-w-0 items-center gap-3 rounded-xl border border-white/7 bg-white/[0.025] p-3 transition hover:border-[color:var(--accent-soft)] hover:bg-white/[0.04]"
    >
      <Avatar className="h-9 w-9">
        {moment.actor?.avatar_url ? (
          <AvatarImage src={moment.actor.avatar_url} alt={playerName} />
        ) : null}
        <AvatarFallback>{initials(playerName)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-sm">
          <span className="truncate font-semibold">{playerName}</span>
          <span className={cn("font-semibold", outcome === "win" && "text-emerald-300", outcome === "loss" && "text-red-300")}>
            {meta.verb}
          </span>
          <span className="text-[color:var(--color-muted)]">their game</span>
        </div>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
          <span>{relativeTime(moment.played_at ?? moment.created_at)}</span>
          <span className="text-white/18">/</span>
          <span>{stats.kda ?? "KDA --"}</span>
          <span className="text-white/18">/</span>
          <span>{stats.score ?? "--"}</span>
        </div>
      </div>

      <div
        className={cn(
          "hidden shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] sm:inline-flex",
          meta.className,
        )}
      >
        <Icon className="h-3 w-3" />
        {labelForMoment(moment, meta.label)}
      </div>
    </Link>
  );
}

function outcomeForMoment(moment: Pick<MatchMomentRow, "label">): keyof typeof OUTCOME_META {
  if (
    moment.label === "Won match" ||
    moment.label === "CARRIED ALL!!" ||
    moment.label === "GOT CARRIED"
  ) {
    return "win";
  }

  if (
    moment.label === "Lost match" ||
    moment.label === "INTED MATCH" ||
    moment.label === "TEAM SOLD HIM"
  ) {
    return "loss";
  }

  return "draw";
}

function labelForMoment(moment: MatchMomentRow, fallback: string): string {
  if (moment.label === "Won match" || moment.label === "Lost match" || moment.label === "Drew match") {
    return fallback;
  }

  return moment.label;
}

function playerNameForMoment(moment: RecentPlayerGameMoment): string {
  return (
    moment.actor?.display_name ??
    moment.actor?.email?.split("@")[0] ??
    moment.profile?.riot_name ??
    "Teammate"
  );
}

function matchHref(moment: RecentPlayerGameMoment): string {
  if (!moment.profile) return "/desktop";

  const params = moment.profile.region
    ? `?region=${encodeURIComponent(moment.profile.region)}`
    : "";

  return `/stats/${encodeURIComponent(moment.profile.riot_name)}/${encodeURIComponent(
    moment.profile.riot_tag,
  )}/matches/${encodeURIComponent(moment.match_id)}${params}`;
}
