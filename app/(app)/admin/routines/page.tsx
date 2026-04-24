import { requireAdmin } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PlayerRoutineManager } from "@/components/admin/player-routine-manager";
import type { RoutineRow, UserRow } from "@/types/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Player Routines" };

type PlayerRoutineUser = Pick<
  UserRow,
  "id" | "display_name" | "email" | "avatar_url" | "role" | "team_id"
>;

export default async function AdminRoutinesPage() {
  const { user, team } = await requireAdmin();
  const admin = createSupabaseAdminClient();

  const [{ data: players }, { data: routines }] = await Promise.all([
    admin
      .from("users")
      .select("id, display_name, email, avatar_url, role, team_id")
      .eq("team_id", user.team_id)
      .order("display_name", { ascending: true }),
    admin
      .from("routines")
      .select("*")
      .eq("team_id", user.team_id)
      .eq("scope", "daily")
      .not("assigned_user_id", "is", null)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <div className="flex max-w-[1200px] flex-col gap-5">
      <header>
        <div className="eyebrow">Admin</div>
        <h1 className="mt-1 font-display text-3xl tracking-wide">
          Player routines
        </h1>
        <p className="mt-1 text-[color:var(--color-muted)]">
          Set a daily routine for each player on {team.name}. Player-specific
          routines override the default team routine immediately.
        </p>
      </header>

      <PlayerRoutineManager
        players={(players ?? []) as PlayerRoutineUser[]}
        routines={(routines ?? []) as RoutineRow[]}
      />
    </div>
  );
}
