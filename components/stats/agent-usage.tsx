import type { NormalizedMatch } from "@/types/domain";

export function AgentUsage({ matches }: { matches: NormalizedMatch[] }) {
  const by = new Map<string, { games: number; wins: number; acs: number[] }>();
  for (const m of matches) {
    if (!m.agent) continue;
    const b = by.get(m.agent) ?? { games: 0, wins: 0, acs: [] };
    b.games++;
    if (m.result === "win") b.wins++;
    b.acs.push(m.acs);
    by.set(m.agent, b);
  }
  const rows = [...by.entries()]
    .map(([agent, v]) => ({
      agent,
      games: v.games,
      winRate: v.games > 0 ? v.wins / v.games : 0,
      acs: v.acs.length ? Math.round(v.acs.reduce((a, b) => a + b, 0) / v.acs.length) : 0,
    }))
    .sort((a, b) => b.games - a.games);

  const max = rows[0]?.games ?? 1;

  return (
    <div className="surface p-5 h-full">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Agent Pool</span>
        <span className="text-xs text-[color:var(--color-muted)]">
          {rows.length} agents
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-2.5">
        {rows.length === 0 ? (
          <p className="text-sm text-[color:var(--color-muted)]">No data yet.</p>
        ) : (
          rows.map((r) => (
            <div key={r.agent} className="flex items-center gap-3">
              <div className="w-20 font-display tracking-wide text-sm">
                {r.agent}
              </div>
              <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-[color:var(--accent)] shadow-[0_0_10px_var(--accent-soft)]"
                  style={{ width: `${(r.games / max) * 100}%` }}
                />
              </div>
              <div className="text-xs text-[color:var(--color-muted)] w-[140px] text-right tabular-nums">
                {r.games}g · {(r.winRate * 100).toFixed(0)}% · {r.acs} ACS
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
