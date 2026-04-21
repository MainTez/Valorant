import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function logAudit(params: {
  actorId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("audit_logs").insert({
    actor_id: params.actorId,
    action: params.action,
    target_type: params.targetType ?? null,
    target_id: params.targetId ?? null,
    metadata: params.metadata ?? {},
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[audit] insert failed:", error.message);
  }
}

export async function logActivity(params: {
  teamId: string;
  actorId: string | null;
  verb: string;
  objectType?: string;
  objectId?: string;
  payload?: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("activity_events").insert({
    team_id: params.teamId,
    actor_id: params.actorId,
    verb: params.verb,
    object_type: params.objectType ?? null,
    object_id: params.objectId ?? null,
    payload: params.payload ?? {},
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[activity] insert failed:", error.message);
  }
}
