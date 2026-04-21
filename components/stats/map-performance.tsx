import type { NormalizedMatch } from "@/types/domain";
import { cn } from "@/lib/utils";

export function MapPerformance({ matches }: { matches: NormalizedMatch[] }) {
  const by = new Map<string, { games: number; wins: number; acs: number[] }>();
  for (const m of matches) {
    const b = by.get(m.map) ?? { games: 0, wins: 0, acs: [] };
    b.games++;
    if (m.result === "win") b.wins++;
    b.acs.push(m.acs);
    by.set(m.map, b);
  }
  const rows = [...by.entries()]
    .map(([map, v]) => ({
      map,
      games: v.games,
      winRate: v.games > 0 ? v.wins / v.games : 0,
      acs: v.acs.length ? Math.round(v.acs.reduce((a, b) => a + b, 0) / v.acs.length) : 0,
    }))
    .sort((a, b) => b.games - a.games);

  return (
    <div className="surface p-5 h-full">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Map Performance</span>
        <span className="text-xs text-[color:var(--color-muted)]">{rows.length} maps</span>
      </div>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rows.length === 0 ? (
          <p className="text-sm text-[color:var(--color-muted)]">No data yet.</p>
        ) : (
          rows.map((r) => (
            <div
              key={r.map}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3"
            >
              <div>
                <div className="font-display tracking-wide text-sm">{r.map}</div>
                <div className="text-[11px] uppercase tracking-widest text-[color:var(--color-muted)]">
                  {r.games} games · {r.acs} ACS avg
                </div>
              </div>
              <div
                className={cn(
                  "font-display text-lg tracking-wider",
                  r.winRate >= 0.55 && "text-green-400",
                  r.winRate < 0.45 && "text-red-400",
                )}
              >
                {(r.winRate * 100).toFixed(0)}%
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
