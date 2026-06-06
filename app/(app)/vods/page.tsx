import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VodLibrary } from "@/components/vods/vod-library";
import type { MatchRow, UserRow, VodClipRow } from "@/types/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "VOD Library" };

export default async function VodsPage() {
  const { team, user } = await requireSession();
  const supabase = await createSupabaseServerClient();
  const [{ data: matches }, { data: clips }, { data: members }] = await Promise.all([
    supabase
      .from("matches")
      .select("*")
      .eq("team_id", team.id)
      .order("date", { ascending: false })
      .limit(200),
    supabase
      .from("vod_clips")
      .select("*")
      .eq("team_id", team.id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("users")
      .select("id, display_name, email, avatar_url")
      .eq("team_id", team.id),
  ]);

  return (
    <div className="flex flex-col gap-5 max-w-[1400px]">
      <header className="flex flex-col gap-2">
        <div className="eyebrow">Review room</div>
        <h1 className="font-display text-3xl tracking-wide mt-1">
          {team.name} VOD library
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-[color:var(--color-muted)]">
          Save Outplayed, Ascent, and Medal review links on each match, then keep
          short clips in the same workspace.
        </p>
      </header>
      <VodLibrary
        clips={(clips ?? []) as VodClipRow[]}
        currentUserId={user.id}
        currentUserRole={user.role}
        matches={(matches ?? []) as MatchRow[]}
        members={
          (members ?? []) as Array<Pick<UserRow, "id" | "display_name" | "email" | "avatar_url">>
        }
        teamName={team.name}
      />
    </div>
  );
}
