import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveMatchVodSource } from "@/lib/vods";
import { VodLibrary } from "@/components/vods/vod-library";
import type { MatchRow } from "@/types/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "VOD Library" };

export default async function VodsPage() {
  const { team } = await requireSession();
  const supabase = await createSupabaseServerClient();
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .eq("team_id", team.id)
    .order("date", { ascending: false })
    .limit(200);

  const vodMatches = ((matches ?? []) as MatchRow[]).filter(
    (match) => resolveMatchVodSource(match).kind !== "missing",
  );

  return (
    <div className="flex flex-col gap-5 max-w-[1400px]">
      <header>
        <div className="eyebrow">VODs</div>
        <h1 className="font-display text-3xl tracking-wide mt-1">{team.name} VOD library</h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted)] max-w-2xl">
          Browse uploaded match footage and external VOD links in one place.
        </p>
      </header>
      <VodLibrary matches={vodMatches} />
    </div>
  );
}
