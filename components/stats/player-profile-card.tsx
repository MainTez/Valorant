import { Hash, Swords, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RankBadge } from "@/components/common/rank-badge";
import type { NormalizedAccount, NormalizedMMR, NormalizedMatch } from "@/types/domain";
import { cn } from "@/lib/utils";

interface Props {
  account: NormalizedAccount | null;
  mmr: NormalizedMMR | null;
  matches: NormalizedMatch[];
  region: string;
  onTeam?: boolean;
}

export function PlayerProfileCard({ account, mmr, matches, region, onTeam }: Props) {
  const wins = matches.filter((m) => m.result === "win").length;
  const decided = matches.filter((m) => m.result === "win" || m.result === "loss").length;
  const winRate = decided > 0 ? Math.round((wins / decided) * 100) : null;
  const acs = matches.length ? Math.round(avg(matches.map((m) => m.acs))) : null;
  const kd = matches.length ? avg(matches.map((m) => (m.deaths === 0 ? m.kills : m.kills / Math.max(1, m.deaths)))) : null;
  const hs = matches.length ? avg(matches.map((m) => m.headshotPct)) : null;

  return (
    <div className="surface-accent relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(circle at 90% 0%, var(--accent-dim), transparent 50%)",
        }}
      />
      {account?.cardUrl ? (
        <div
          aria-hidden
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: `url(${account.cardUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "right center",
            mixBlendMode: "screen",
          }}
        />
      ) : null}
      <div className="relative p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="eyebrow">Player Profile</span>
            {onTeam ? <Badge>On roster</Badge> : <Badge variant="outline">External</Badge>}
            <Badge variant="outline">{region.toUpperCase()}</Badge>
          </div>
          <h1 className="font-display text-4xl tracking-wide mt-2">
            {account?.name ?? "—"}{" "}
            <span className="text-[color:var(--color-muted)]">#{account?.tag ?? "0000"}</span>
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            <RankBadge rank={mmr?.currentTier} rr={mmr?.currentRR ?? undefined} />
            {mmr?.peakTier ? (
              <div className="flex items-center gap-1.5 text-sm text-[color:var(--color-muted)]">
                <TrendingUp className="h-4 w-4" />
                Peak: <span className="text-[color:var(--color-text)] font-display tracking-wide">{mmr.peakTier}</span>
              </div>
            ) : null}
            {mmr?.leaderboardPlace ? (
              <div className="flex items-center gap-1.5 text-sm text-[color:var(--color-muted)]">
                <Hash className="h-4 w-4" /> Leaderboard #{mmr.leaderboardPlace.toLocaleString()}
              </div>
            ) : null}
            {account?.accountLevel ? (
              <div className="flex items-center gap-1.5 text-sm text-[color:var(--color-muted)]">
                <Swords className="h-4 w-4" /> Lvl {account.accountLevel}
              </div>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto">
          <Stat label="Win Rate" value={winRate != null ? `${winRate}%` : "—"} tone={winRate != null && winRate >= 55 ? "pos" : winRate != null && winRate < 45 ? "neg" : undefined} />
          <Stat label="K/D" value={kd != null ? kd.toFixed(2) : "—"} />
          <Stat label="ACS" value={acs != null ? acs.toLocaleString() : "—"} />
          <Stat label="HS%" value={hs != null ? `${hs.toFixed(0)}%` : "—"} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 min-w-[110px]">
      <div className="eyebrow">{label}</div>
      <div
        className={cn(
          "font-display text-2xl tracking-wider mt-1",
          tone === "pos" && "text-green-400",
          tone === "neg" && "text-red-400",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
