import Link from "next/link";
import { Calendar, Map as MapIcon, Swords } from "lucide-react";
import { resolveMatchVodSource } from "@/lib/vods";
import type { MatchRow } from "@/types/domain";

export function VodCard({ match }: { match: MatchRow }) {
  const source = resolveMatchVodSource({
    vod_storage_path: match.vod_storage_path,
    vod_url: match.vod_url,
  });

  return (
    <article className="surface p-5 grid gap-4 h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow">VOD</div>
          <h2 className="font-display text-2xl tracking-wide mt-1">vs {match.opponent}</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-widest text-[color:var(--color-muted)]">
          {source.kind === "uploaded" ? "Uploaded" : "External"}
        </span>
      </div>

      <div className="grid gap-2 text-sm text-[color:var(--color-muted)]">
        <div className="flex items-center gap-2">
          <MapIcon className="h-4 w-4" />
          <span>{match.map}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>{new Date(match.date).toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4" />
          <span className="capitalize">
            {match.type} · {match.score_us} - {match.score_them}
          </span>
        </div>
      </div>

      <div className="mt-auto flex items-center gap-3 flex-wrap text-sm">
        <Link className="text-[color:var(--accent)] hover:underline" href={`/vods/${match.id}`}>
          Open VOD
        </Link>
        <Link className="text-[color:var(--color-muted)] hover:underline" href={`/matches/${match.id}`}>
          Match details
        </Link>
      </div>
    </article>
  );
}
