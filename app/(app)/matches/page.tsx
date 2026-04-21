import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MatchLogTable } from "@/components/matches/match-log-table";
import type { MatchRow } from "@/types/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "Match Log" };

export default async function MatchesPage() {
  const { team } = await requireSession();
  const supabase = await createSupabaseServerClient();
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .eq("team_id", team.id)
    .order("date", { ascending: false })
    .limit(100);

  return (
    <div className="flex flex-col gap-5 max-w-[1400px]">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="eyebrow">Match Log</div>
          <h1 className="font-display text-3xl tracking-wide mt-1">
            {team.name} scrims & officials
          </h1>
        </div>
        <Link href="/matches/new" className="btn-accent">
          <Plus className="h-4 w-4" /> Log Match
        </Link>
      </header>
      <MatchLogTable matches={(matches ?? []) as MatchRow[]} />
    </div>
  );
}
