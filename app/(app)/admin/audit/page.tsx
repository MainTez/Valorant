import { requireAdmin } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { relativeTime } from "@/lib/utils";
import { ScrollText } from "lucide-react";
import type { AuditLogRow, UserRow } from "@/types/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Audit Log" };

export default async function AuditLogPage() {
  await requireAdmin();
  const admin = createSupabaseAdminClient();

  const { data: logs } = await admin
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const actorIds = [
    ...new Set(
      ((logs ?? []) as AuditLogRow[])
        .map((l) => l.actor_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const { data: users } =
    actorIds.length > 0
      ? await admin
          .from("users")
          .select("id, display_name, email")
          .in("id", actorIds)
      : { data: [] as Array<Pick<UserRow, "id" | "display_name" | "email">> };

  const usersById = Object.fromEntries(
    ((users ?? []) as Array<Pick<UserRow, "id" | "display_name" | "email">>).map(
      (u) => [u.id, u],
    ),
  );

  const rows = ((logs ?? []) as AuditLogRow[]);

  return (
    <div className="flex flex-col gap-5 max-w-[1200px]">
      <header>
        <div className="eyebrow">Admin</div>
        <h1 className="font-display text-3xl tracking-wide mt-1">Audit log</h1>
        <p className="text-[color:var(--color-muted)] mt-1">
          Last 200 administrative events.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Nothing logged yet"
          description="Events show up here as admin actions happen."
        />
      ) : (
        <div className="surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-widest text-[color:var(--color-muted)]">
                <tr>
                  <th className="text-left px-4 py-3">When</th>
                  <th className="text-left px-4 py-3">Actor</th>
                  <th className="text-left px-4 py-3">Action</th>
                  <th className="text-left px-4 py-3">Target</th>
                  <th className="text-left px-4 py-3">Metadata</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => {
                  const who = l.actor_id ? usersById[l.actor_id] : null;
                  return (
                    <tr key={l.id} className="border-t border-white/5">
                      <td className="px-4 py-2.5 text-[color:var(--color-muted)] whitespace-nowrap">
                        {relativeTime(l.created_at)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {who?.display_name ?? who?.email ?? "system"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline">{l.action}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-[color:var(--color-muted)]">
                        {l.target_type ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[color:var(--color-muted)]">
                        <pre className="font-mono whitespace-pre-wrap break-words max-w-[36ch]">
                          {Object.keys(l.metadata ?? {}).length
                            ? JSON.stringify(l.metadata)
                            : "—"}
                        </pre>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
