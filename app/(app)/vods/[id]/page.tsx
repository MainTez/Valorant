import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Map as MapIcon } from "lucide-react";
import { MatchVodManager } from "@/components/matches/match-vod-manager";
import { VodPlayer } from "@/components/vods/vod-player";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveMatchVodSource } from "@/lib/vods";
import type { MatchRow } from "@/types/domain";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function VodDetailPage({ params }: Props) {
  const { id } = await params;
  const { team } = await requireSession();
  const supabase = await createSupabaseServerClient();

  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .eq("team_id", team.id)
    .maybeSingle();

  if (!match) notFound();

  const m = match as MatchRow;
  const vodSource = resolveMatchVodSource({
    vod_storage_path: m.vod_storage_path,
    vod_url: m.vod_url,
  });

  if (vodSource.kind === "missing") {
    notFound();
  }

  return (
    <div className="flex flex-col gap-5 max-w-[1200px]">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link href="/vods" className="text-sm text-[color:var(--color-muted)] hover:accent-text">
            ← Back to VOD library
          </Link>
          <div className="eyebrow mt-2">VOD</div>
          <h1 className="font-display text-3xl tracking-wide mt-1">vs {m.opponent}</h1>
        </div>
        <div className="grid gap-2 text-sm text-[color:var(--color-muted)] text-right">
          <div className="inline-flex items-center justify-end gap-2">
            <MapIcon className="h-4 w-4" />
            <span>{m.map}</span>
          </div>
          <div className="inline-flex items-center justify-end gap-2">
            <Calendar className="h-4 w-4" />
            <span>{new Date(m.date).toLocaleString()}</span>
          </div>
          <Link href={`/matches/${m.id}`} className="text-[color:var(--accent)] hover:underline">
            Open match details
          </Link>
        </div>
      </header>

      <VodPlayer matchId={m.id} />

      <MatchVodManager
        externalVodUrl={m.vod_url}
        matchId={m.id}
        uploadedVodHref={m.vod_storage_path ? `/api/matches/${m.id}/vod` : null}
        vodDetailHref={`/vods/${m.id}`}
        vodOriginalName={m.vod_original_name}
        vodSizeBytes={m.vod_size_bytes}
      />
    </div>
  );
}
