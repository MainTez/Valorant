import Link from "next/link";
import { VodCard } from "@/components/vods/vod-card";
import type { MatchRow } from "@/types/domain";

export function VodLibrary({ matches }: { matches: MatchRow[] }) {
  if (matches.length === 0) {
    return (
      <div className="surface p-8 text-center">
        <div className="eyebrow">VOD Library</div>
        <p className="mt-3 text-sm text-[color:var(--color-muted)]">
          No VODs yet. Upload an MP4 or add an external link from the match log.
        </p>
        <Link href="/matches/new" className="btn-accent mt-5 inline-flex">
          Log match
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {matches.map((match) => (
        <VodCard key={match.id} match={match} />
      ))}
    </div>
  );
}
