import Link from "next/link";
import { cn } from "@/lib/utils";
import type { MatchRow } from "@/types/domain";

export function RecentMatches({ matches }: { matches: MatchRow[] }) {
  return (
    <div className="surface p-5 h-full">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Recent Matches</span>
        <Link href="/matches" className="text-xs accent-text hover:underline">
          View all
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {matches.length === 0 ? (
          <p className="col-span-full text-sm text-[color:var(--color-muted)]">
            No matches logged yet.
          </p>
        ) : (
          matches.slice(0, 5).map((m) => (
            <Link
              key={m.id}
              href={`/matches`}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:border-[color:var(--accent-soft)] transition flex flex-col gap-2"
            >
              <div
                className={cn(
                  "text-xs font-display tracking-wider uppercase",
                  m.result === "win"
                    ? "text-green-400"
                    : m.result === "loss"
                      ? "text-red-400"
                      : "text-[color:var(--color-muted)]",
                )}
              >
                {m.result === "win" ? "Victory" : m.result === "loss" ? "Defeat" : "Draw"}
              </div>
              <div className="font-display text-xl tracking-wider">
                {m.score_us} - {m.score_them}
              </div>
              <div className="text-xs text-[color:var(--color-muted)] mt-auto">
                <div className="truncate">vs {m.opponent}</div>
                <div>{m.map}</div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
