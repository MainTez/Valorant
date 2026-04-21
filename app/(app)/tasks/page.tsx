import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TaskBoard } from "@/components/tasks/task-board";
import type { TaskRow, UserRow } from "@/types/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tasks" };

export default async function TasksPage() {
  const { user, team } = await requireSession();
  const supabase = await createSupabaseServerClient();

  const [{ data: tasks }, { data: members }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("team_id", team.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("users")
      .select("id, display_name, email, avatar_url")
      .eq("team_id", team.id),
  ]);

  return (
    <div className="flex flex-col gap-5 max-w-[1400px]">
      <header>
        <div className="eyebrow">Tasks</div>
        <h1 className="font-display text-3xl tracking-wide mt-1">Team board</h1>
        <p className="text-[color:var(--color-muted)] mt-1">
          Track review tasks, utility drills, and agent practice across {team.name}.
        </p>
      </header>

      <TaskBoard
        tasks={(tasks ?? []) as TaskRow[]}
        members={
          (members ?? []) as Array<Pick<UserRow, "id" | "display_name" | "email" | "avatar_url">>
        }
        currentUserId={user.id}
      />
    </div>
  );
}
