import { ListTree } from "lucide-react";

export function DataSources({
  points,
  bestAgents,
  weakMaps,
}: {
  points: Record<string, unknown>;
  bestAgents: Array<{ agent: string; games: number; acs: number; winRate: number }>;
  weakMaps: Array<{ map: string; games: number; winRate: number }>;
}) {
  const rows = Object.entries(points);
  return (
    <div className="surface p-5">
      <div className="flex items-center gap-2">
        <ListTree className="h-4 w-4 text-[color:var(--accent)]" />
        <div className="eyebrow">Data Points</div>
      </div>
      <p className="text-xs text-[color:var(--color-muted)] mt-1">
        Every number above is derived from these values. Nothing is guessed.
      </p>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between border-b border-white/5 pb-1.5">
            <span className="text-[color:var(--color-muted)]">{k}</span>
            <span className="font-display tracking-wide">
              {typeof v === "number" ? v.toLocaleString() : String(v ?? "—")}
            </span>
          </div>
        ))}
      </div>
      {bestAgents.length > 0 ? (
        <div className="mt-5">
          <div className="eyebrow mb-2">Top agents</div>
          <div className="flex flex-wrap gap-2">
            {bestAgents.map((a) => (
              <span
                key={a.agent}
                className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs"
              >
                <span className="font-display tracking-wide">{a.agent}</span>{" "}
                <span className="text-[color:var(--color-muted)]">
                  {a.games}g · {(a.winRate * 100).toFixed(0)}% · {a.acs} ACS
                </span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {weakMaps.length > 0 ? (
        <div className="mt-4">
          <div className="eyebrow mb-2">Struggling maps</div>
          <div className="flex flex-wrap gap-2">
            {weakMaps.map((m) => (
              <span
                key={m.map}
                className="rounded-md border border-red-500/20 bg-red-500/[0.06] px-2.5 py-1.5 text-xs text-red-300"
              >
                {m.map} · {(m.winRate * 100).toFixed(0)}% over {m.games}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
