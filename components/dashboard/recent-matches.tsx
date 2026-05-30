import Link from "next/link";
import { tournamentMatchupHref } from "@/lib/ggarena/matchup-links";
import { cn } from "@/lib/utils";
import { formatNorwayDate } from "@/lib/timezone";
import type { GGArenaMatchup } from "@/lib/ggarena/normalize";
import type { MatchRow } from "@/types/domain";

export function RecentMatches({
  matches,
  tournamentMatches = [],
}: {
  matches: MatchRow[];
  tournamentMatches?: GGArenaMatchup[];
}) {
  const showTournamentMatches = tournamentMatches.length > 0;

  return (
    <div className="surface p-5 h-full">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Recent Matches</span>
        <Link
          href={showTournamentMatches ? "/tournaments" : "/matches"}
          className="text-xs accent-text hover:underline"
        >
          View all
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {showTournamentMatches ? (
          tournamentMatches.slice(0, 5).map((matchup) => (
            <TournamentMatchCard
              key={matchup.uuid ?? matchup.id ?? `${matchup.name}-${matchup.startsAt}`}
              matchup={matchup}
            />
          ))
        ) : matches.length === 0 ? (
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

function TournamentMatchCard({ matchup }: { matchup: GGArenaMatchup }) {
  const result = matchup.surfResult;
  const resultLabel =
    result === "win" ? "Victory" : result === "loss" ? "Defeat" : result === "draw" ? "Draw" : "Pending";

  return (
    <Link
      href={tournamentMatchupHref(matchup)}
      className="rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:border-[color:var(--accent-soft)] transition flex flex-col gap-2"
      title="Open match KDA"
    >
      <div
        className={cn(
          "text-xs font-display tracking-wider uppercase",
          result === "win"
            ? "text-green-400"
            : result === "loss"
              ? "text-red-400"
              : "text-[color:var(--color-muted)]",
        )}
      >
        {resultLabel}
      </div>
      <div className="font-display text-xl tracking-wider">
        {matchup.scoreline ?? "TBD"}
      </div>
      <div className="text-xs text-[color:var(--color-muted)] mt-auto">
        <div className="truncate">vs {matchup.opponentName ?? matchup.name}</div>
        <div className="truncate">
          {matchup.startsAt ? formatNorwayDate(matchup.startsAt) : matchup.divisionName ?? "GGarena"}
        </div>
      </div>
    </Link>
  );
}
