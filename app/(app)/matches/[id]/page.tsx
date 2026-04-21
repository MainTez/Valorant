import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, ExternalLink, Map as MapIcon } from "lucide-react";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CoachNotesSection } from "@/components/matches/coach-notes-section";
import { cn } from "@/lib/utils";
import type { CoachNoteRow, MatchRow, UserRow } from "@/types/domain";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MatchDetailPage({ params }: Props) {
  const { id } = await params;
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
        <div className="text-right">
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
      </header>

      <section className="surface p-5 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
        <Detail icon={<MapIcon className="h-4 w-4" />} label="Map" value={m.map} />
        <Detail icon={<Calendar className="h-4 w-4" />} label="Date" value={new Date(m.date).toLocaleString()} />
        <Detail label="Type" value={m.type} />
        <Detail
          label="VOD"
          value={
            m.vod_url ? (
              <a
                href={m.vod_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[color:var(--accent)] hover:underline"
              >
                Open <ExternalLink className="h-3.5 w-3.5" />
              </a>
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
