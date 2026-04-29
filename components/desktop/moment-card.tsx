import { Flame, Radio, Skull, Sparkles, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, initials, relativeTime } from "@/lib/utils";
import type { DesktopMoment } from "@/components/desktop/types";

interface MomentCardProps {
  moment: DesktopMoment;
  compact?: boolean;
  className?: string;
}

const SEVERITY_META = {
  hype: {
    icon: Trophy,
    className: "border-[#f8c85a]/45 bg-[#f8c85a]/12 text-[#ffd66f]",
  },
  flame: {
    icon: Skull,
    className: "border-[#ff5a70]/50 bg-[#ff5a70]/12 text-[#ff7186]",
  },
  warning: {
    icon: Flame,
    className: "border-[#ff9d42]/45 bg-[#ff9d42]/12 text-[#ffb267]",
  },
  normal: {
    icon: Radio,
    className: "border-white/12 bg-white/[0.04] text-white/76",
  },
} as const;

export function MomentCard({ className, compact = false, moment }: MomentCardProps) {
  const actorName =
    moment.actor?.display_name ??
    moment.actor?.email?.split("@")[0] ??
    moment.profile?.riot_name ??
    "Unknown";
  const meta = SEVERITY_META[moment.severity];
  const Icon = meta.icon;
  const stats = moment.stats as {
    kda?: string;
    acs?: number | null;
    adr?: number | null;
    score?: string;
  };

  return (
    <article
      className={cn(
        "group relative isolate overflow-hidden rounded-[1.35rem] border bg-[linear-gradient(135deg,rgba(12,16,24,0.98)_0%,rgba(6,9,15,0.96)_58%,rgba(255,255,255,0.035)_100%)] p-4 shadow-[0_24px_80px_-44px_rgba(0,0,0,0.95)]",
        moment.severity === "hype" && "border-[#f8c85a]/32",
        moment.severity === "flame" && "border-[#ff5a70]/34",
        moment.severity === "warning" && "border-[#ff9d42]/30",
        moment.severity === "normal" && "border-white/8",
        compact ? "p-4" : "p-5",
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          moment.severity === "hype" && "bg-[#f8c85a]",
          moment.severity === "flame" && "bg-[#ff5a70]",
          moment.severity === "warning" && "bg-[#ff9d42]",
          moment.severity === "normal" && "bg-white/24",
        )}
      />
      <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[color:var(--accent-dim)] blur-3xl transition group-hover:opacity-100" />
      <div className="relative flex items-start gap-4">
        <Avatar className={compact ? "h-10 w-10" : "h-12 w-12"}>
          {moment.actor?.avatar_url ? (
            <AvatarImage src={moment.actor.avatar_url} alt={actorName} />
          ) : null}
          <AvatarFallback>{initials(actorName)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn("border", meta.className)}>
              <Icon className="h-3.5 w-3.5" />
              {moment.label}
            </Badge>
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/36">
              {relativeTime(moment.created_at)}
            </span>
          </div>

          <h3
            className={cn(
              "mt-3 font-display uppercase leading-none tracking-[0.045em] text-white",
              compact ? "text-2xl" : "text-[2.35rem]",
            )}
          >
            {moment.title}
          </h3>
          <p className="mt-2 text-sm text-white/58">{moment.subtitle}</p>

          <div className="mt-4 grid grid-cols-4 gap-2">
            <Stat label="KDA" value={stats.kda ?? "--"} />
            <Stat label="ACS" value={formatNumber(stats.acs)} />
            <Stat label="ADR" value={formatNumber(stats.adr)} />
            <Stat label="Score" value={stats.score ?? "--"} />
          </div>
        </div>

        <div className="hidden text-right sm:block">
          <div className="font-display text-3xl leading-none text-white">
            {moment.performance_index}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/34">
            index
          </div>
          <Sparkles className="ml-auto mt-4 h-5 w-5 text-[color:var(--accent)]" />
        </div>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/7 bg-white/[0.025] px-3 py-2">
      <div className="text-[0.62rem] uppercase tracking-[0.2em] text-white/34">{label}</div>
      <div className="mt-1 font-display text-lg leading-none text-white">{value}</div>
    </div>
  );
}

function formatNumber(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? String(Math.round(value)) : "--";
}
