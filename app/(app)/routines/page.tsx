import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RoutineChecklist } from "@/components/routines/routine-checklist";
import { EmptyState } from "@/components/common/empty-state";
import { ListChecks } from "lucide-react";
import type { RoutineProgressRow, RoutineRow } from "@/types/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "Routines" };

export default async function RoutinesPage() {
  const { user, team } = await requireSession();
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: routines }, { data: progressRows }] = await Promise.all([
    supabase
      .from("routines")
      .select("*")
      .eq("team_id", team.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("routine_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today),
  ]);

  const list = (routines ?? []) as RoutineRow[];
  const byRoutine = new Map<string, RoutineProgressRow>();
  for (const p of (progressRows ?? []) as RoutineProgressRow[]) {
    byRoutine.set(p.routine_id, p);
  }

  return (
    <div className="flex flex-col gap-5 max-w-[1200px]">
      <header>
        <div className="eyebrow">Routines</div>
        <h1 className="font-display text-3xl tracking-wide mt-1">
          Daily discipline
        </h1>
        <p className="text-[color:var(--color-muted)] mt-1">
          Your personal checklist. Progress saves as you go — every win is
          compounded.
        </p>
      </header>

      {list.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No routines configured yet"
          description="A coach or admin can add a daily routine — aim, deathmatch, VOD review, and more."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {list.map((r) => (
            <RoutineChecklist
              key={r.id}
              routine={r}
              progress={byRoutine.get(r.id) ?? null}
              date={today}
            />
          ))}
        </div>
      )}
    </div>
  );
}
