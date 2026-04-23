import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, ExternalLink, Map as MapIcon } from "lucide-react";
import { DeleteMatchButton } from "@/components/matches/delete-match-button";
import { MatchVodManager } from "@/components/matches/match-vod-manager";
import { CoachNotesSection } from "@/components/matches/coach-notes-section";
import { VodPlayer } from "@/components/vods/vod-player";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canDeleteMatch, resolveMatchVodSource } from "@/lib/vods";
import { cn } from "@/lib/utils";
import type { CoachNoteRow, MatchRow, UserRow } from "@/types/domain";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MatchDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const { user, team } = await requireSession();
  const supabase = await createSupabaseServerClient();

  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .eq("team_id", team.id)
    .maybeSingle();
  if (!match) notFound();

  const [{ data: notesRaw }, { data: members }] = await Promise.all([
    supabase
      .from("coach_notes")
      .select("*")
      .eq("match_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("users")
      .select("id, display_name, email")
      .eq("team_id", team.id),
  ]);

  const membersById = Object.fromEntries(
    ((members ?? []) as Array<Pick<UserRow, "id" | "display_name" | "email">>).map((m) => [
      m.id,
      m,
    ]),
  );
  const notes = ((notesRaw ?? []) as CoachNoteRow[]).map((n) => ({
    ...n,
    author: n.author_id ? membersById[n.author_id] ?? null : null,
  }));

  const m = match as MatchRow;
  const vodSource = resolveMatchVodSource({
    vod_storage_path: m.vod_storage_path,
    vod_url: m.vod_url,
  });
  const canDelete = canDeleteMatch({
    createdBy: m.created_by,
    role: user.role,
    userId: user.id,
  });
  const uploadedVodHref = m.vod_storage_path ? `/api/matches/${m.id}/vod` : null;
  const vodDetailHref = vodSource.kind === "missing" ? null : `/vods/${m.id}`;
  const initialVodError =
    typeof sp.vodUploadError === "string"
      ? sp.vodUploadError
      : sp.vodUpload === "failed"
        ? "Match saved, but the MP4 upload did not finish. Retry below."
        : null;

  return (
    <div className="flex flex-col gap-5 max-w-[1100px]">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link href="/matches" className="text-sm text-[color:var(--color-muted)] hover:accent-text">
            ← Back to match log
          </Link>
          <div className="eyebrow mt-2">Match</div>
          <h1 className="font-display text-3xl tracking-wide mt-1">
            vs {m.opponent}
          </h1>
        </div>
        <div className="text-right flex flex-col items-end gap-3">
          <div>
            <div
              className={cn(
                "font-display text-2xl tracking-widest uppercase",
                m.result === "win" && "text-green-400",
                m.result === "loss" && "text-red-400",
                m.result === "draw" && "text-[color:var(--color-muted)]",
              )}
            >
              {m.result}
            </div>
            <div className="font-display text-4xl tracking-wider">
              {m.score_us} - {m.score_them}
            </div>
          </div>
          {canDelete ? (
            <DeleteMatchButton
              matchId={m.id}
              matchLabel={`the match vs ${m.opponent}`}
              redirectTo="/matches"
              variant="outline"
            />
          ) : null}
        </div>
      </header>

      <section className="surface p-5 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
        <Detail icon={<MapIcon className="h-4 w-4" />} label="Map" value={m.map} />
        <Detail icon={<Calendar className="h-4 w-4" />} label="Date" value={new Date(m.date).toLocaleString()} />
        <Detail label="Type" value={m.type} />
        <Detail
          label="VOD"
          value={
            vodDetailHref ? (
              <Link href={vodDetailHref} className="inline-flex items-center gap-1 text-[color:var(--accent)] hover:underline">
                Watch VOD <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <span className="text-[color:var(--color-muted)]">—</span>
            )
          }
        />
      </section>

      {m.notes ? (
        <section className="surface p-5">
          <div className="eyebrow">Match notes</div>
          <p className="mt-2 text-sm whitespace-pre-line">{m.notes}</p>
        </section>
      ) : null}

      {vodSource.kind !== "missing" ? <VodPlayer matchId={m.id} /> : null}

      <MatchVodManager
        externalVodUrl={m.vod_url}
        initialError={initialVodError}
        matchId={m.id}
        uploadedVodHref={uploadedVodHref}
        vodDetailHref={vodDetailHref}
        vodOriginalName={m.vod_original_name}
        vodSizeBytes={m.vod_size_bytes}
      />

      <CoachNotesSection
        matchId={m.id}
        notes={notes}
        canWrite={user.role === "coach" || user.role === "admin"}
      />
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="eyebrow flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="font-display tracking-wide text-base mt-1 capitalize">
        {value}
      </div>
    </div>
  );
}
