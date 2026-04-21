"use client";

import { ResponsiveContainer, LineChart, Line } from "recharts";
import type { MatchRow, PlayerProfileRow } from "@/types/domain";
import { RankBadge } from "@/components/common/rank-badge";
import { cn, fmtInt, fmtNumber } from "@/lib/utils";

interface Props {
  lastMatch: MatchRow | null;
  profile: PlayerProfileRow | null;
  recentResults: Array<"win" | "loss" | "draw">;
  winTrend: number[];
}

export function StatCards({ lastMatch, profile, recentResults, winTrend }: Props) {
  const wins = recentResults.filter((r) => r === "win").length;
  const losses = recentResults.filter((r) => r === "loss").length;
  const decided = wins + losses;
  const winRate = decided > 0 ? Math.round((wins / decided) * 100) : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      <StatCell label="Last Match Result" accent>
        {lastMatch ? (
          <>
            <div
              className={cn(
                "font-display text-[15px] tracking-wider uppercase",
                lastMatch.result === "win"
                  ? "text-green-400"
                  : lastMatch.result === "loss"
                    ? "text-red-400"
                    : "text-[color:var(--color-muted)]",
              )}
            >
              {lastMatch.result === "win" ? "VICTORY" : lastMatch.result === "loss" ? "DEFEAT" : "DRAW"}
            </div>
            <div className="stat-number mt-1">
              {lastMatch.score_us} - {lastMatch.score_them}
            </div>
            <div className="text-xs text-[color:var(--color-muted)] mt-1 truncate">
              vs {lastMatch.opponent} · {lastMatch.map}
            </div>
          </>
        ) : (
          <div className="text-sm text-[color:var(--color-muted)]">No matches yet</div>
        )}
      </StatCell>

      <StatCell label="Current Rating">
        <RankBadge rank={profile?.current_rank} rr={profile?.current_rr ?? undefined} />
        {profile?.peak_rank ? (
          <div className="text-[11px] uppercase tracking-widest text-[color:var(--color-muted)] mt-2">
            Peak: {profile.peak_rank}
          </div>
        ) : null}
      </StatCell>

      <StatCell label="Win Rate">
        <div className="stat-number">{winRate != null ? `${winRate}%` : "—"}</div>
        <div className="text-xs text-[color:var(--color-muted)] mt-0.5">
          Last 10 matches
        </div>
        <div className="h-8 mt-1">
          {winTrend.length >= 2 ? (
            <ResponsiveContainer>
              <LineChart data={winTrend.map((v, i) => ({ i, v }))}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </StatCell>

      <StatCell label="K/D">
        <div className="stat-number">{fmtNumber(profile?.kd_ratio, 2)}</div>
        <div className="text-xs text-[color:var(--color-muted)] mt-0.5">
          Rolling avg
        </div>
      </StatCell>

      <StatCell label="ACS">
        <div className="stat-number">{fmtInt(profile?.acs ?? null)}</div>
        <div className="text-xs text-[color:var(--color-muted)] mt-0.5">
          Rolling avg
        </div>
      </StatCell>
    </div>
  );
}

function StatCell({
  label,
  accent,
  children,
}: {
  label: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(accent ? "surface-accent" : "surface", "p-4 flex flex-col gap-2 hover-lift")}>
      <div className="eyebrow">{label}</div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
