import Link from "next/link";
import { DeleteMatchButton } from "@/components/matches/delete-match-button";
import { canDeleteMatch, resolveMatchVodSource } from "@/lib/vods";
import { cn } from "@/lib/utils";
import type { MatchRow, Role } from "@/types/domain";

export function MatchLogTable({
  currentUserId,
  currentUserRole,
  matches,
}: {
  currentUserId: string;
  currentUserRole: Role;
  matches: MatchRow[];
}) {
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
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {matches.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-[color:var(--color-muted)]">
                  No matches logged yet.
                </td>
              </tr>
            ) : (
              matches.map((m) => {
                const vodSource = resolveMatchVodSource({
                  vod_storage_path: m.vod_storage_path,
                  vod_url: m.vod_url,
                });
                const canDelete = canDeleteMatch({
                  createdBy: m.created_by,
                  role: currentUserRole,
                  userId: currentUserId,
                });

                return (
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
                    <Td className="truncate max-w-[180px]">
                      <Link className="hover:underline" href={`/matches/${m.id}`}>
                        {m.opponent}
                      </Link>
                    </Td>
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
                      {vodSource.kind !== "missing" ? (
                        <Link
                          href={`/vods/${m.id}`}
                          className="text-[color:var(--accent)] hover:underline text-xs"
                        >
                          View VOD
                        </Link>
                      ) : (
                        <span className="text-[color:var(--color-muted)] text-xs">—</span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <Link href={`/matches/${m.id}`} className="text-xs text-[color:var(--color-muted)] hover:underline">
                          Details
                        </Link>
                        {canDelete ? (
                          <DeleteMatchButton
                            matchId={m.id}
                            matchLabel={`the match vs ${m.opponent}`}
                            size="sm"
                            variant="ghost"
                          />
                        ) : null}
                      </div>
                    </Td>
                  </tr>
                );
              })
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
