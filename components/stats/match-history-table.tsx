import { cn } from "@/lib/utils";
import type { NormalizedMatch } from "@/types/domain";

export function MatchHistoryTable({ matches }: { matches: NormalizedMatch[] }) {
  return (
    <div className="surface overflow-hidden">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <span className="eyebrow">Recent Matches</span>
        <span className="text-xs text-[color:var(--color-muted)]">{matches.length} games</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-widest text-[color:var(--color-muted)]">
            <tr>
              <Th>Result</Th>
              <Th>Score</Th>
              <Th>Map</Th>
              <Th>Agent</Th>
              <Th>K/D/A</Th>
              <Th>ACS</Th>
              <Th>ADR</Th>
              <Th>HS%</Th>
              <Th>Mode</Th>
              <Th>When</Th>
            </tr>
          </thead>
          <tbody>
            {matches.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-10 text-center text-[color:var(--color-muted)]">
                  No matches available.
                </td>
              </tr>
            ) : (
              matches.map((m) => (
                <tr key={m.matchId} className="border-t border-white/5 hover:bg-white/[0.025]">
                  <Td>
                    <span
                      className={cn(
                        "font-display tracking-widest uppercase text-xs",
                        m.result === "win" && "text-green-400",
                        m.result === "loss" && "text-red-400",
                        m.result === "draw" && "text-[color:var(--color-muted)]",
                      )}
                    >
                      {m.result === "win" ? "Win" : m.result === "loss" ? "Loss" : "Draw"}
                    </span>
                  </Td>
                  <Td className="font-display tracking-wider">
                    {m.scoreTeam} - {m.scoreOpponent}
                  </Td>
                  <Td>{m.map}</Td>
                  <Td>{m.agent ?? "—"}</Td>
                  <Td>
                    {m.kills}/{m.deaths}/{m.assists}
                  </Td>
                  <Td>{m.acs}</Td>
                  <Td>{m.adr}</Td>
                  <Td>{m.headshotPct.toFixed(0)}%</Td>
                  <Td className="capitalize">{m.mode}</Td>
                  <Td className="text-[color:var(--color-muted)]">
                    {new Date(m.startedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left font-semibold px-4 py-3 whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 whitespace-nowrap", className)}>{children}</td>;
}
