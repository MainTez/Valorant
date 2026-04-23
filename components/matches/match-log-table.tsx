import Link from "next/link";
import { cn } from "@/lib/utils";
import type { MatchRow } from "@/types/domain";

export function MatchLogTable({ matches }: { matches: MatchRow[] }) {
  return (
    <div className="surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-widest text-[color:var(--color-muted)]">
            <tr>
              <Th>Result</Th>
              <Th>Score</Th>
              <Th>Opponent</Th>
              <Th>Map</Th>
              <Th>Type</Th>
              <Th>Date</Th>
              <Th>VOD</Th>
            </tr>
          </thead>
          <tbody>
            {matches.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-[color:var(--color-muted)]">
                  No matches logged yet.
                </td>
              </tr>
            ) : (
              matches.map((m) => (
                <tr key={m.id} className="border-t border-white/5 hover:bg-white/[0.025]">
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
                    {m.score_us} - {m.score_them}
                  </Td>
                  <Td className="truncate max-w-[160px]">{m.opponent}</Td>
                  <Td>{m.map}</Td>
                  <Td className="capitalize">{m.type}</Td>
                  <Td className="text-[color:var(--color-muted)]">
                    {new Date(m.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Td>
                  <Td>
                    {m.vod_storage_path ? (
                      <Link
                        href={`/api/matches/${m.id}/vod`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[color:var(--accent)] hover:underline text-xs"
                      >
                        View upload
                      </Link>
                    ) : m.vod_url ? (
                      <Link
                        href={m.vod_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[color:var(--accent)] hover:underline text-xs"
                      >
                        View link
                      </Link>
                    ) : (
                      <span className="text-[color:var(--color-muted)] text-xs">—</span>
                    )}
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
