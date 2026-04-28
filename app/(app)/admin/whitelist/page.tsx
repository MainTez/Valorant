import { requireAdmin } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { WhitelistManager } from "@/components/admin/whitelist-manager";
import type { TeamRow, WhitelistRow } from "@/types/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Whitelist" };

export default async function AdminWhitelistPage() {
  const { user } = await requireAdmin();
  const admin = createSupabaseAdminClient();

  const [{ data: teams }, { data: entries }] = await Promise.all([
    admin.from("teams").select("*").order("name", { ascending: true }),
    admin
      .from("whitelist")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col gap-5 max-w-[1200px]">
      <header>
        <div className="eyebrow">Admin</div>
        <h1 className="font-display text-3xl tracking-wide mt-1">Whitelist</h1>
        <p className="text-[color:var(--color-muted)] mt-1">
          Control who can sign in to Nexus Team Hub. New entries take effect
          immediately.
        </p>
      </header>
      <WhitelistManager
        teams={(teams ?? []) as TeamRow[]}
        entries={(entries ?? []) as WhitelistRow[]}
        currentAdminTeamId={user.team_id}
      />
    </div>
  );
}
