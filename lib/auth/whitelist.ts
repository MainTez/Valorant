import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UserRow, WhitelistRow } from "@/types/domain";

export async function findWhitelistEntry(
  email: string,
  teamId?: string | null,
): Promise<WhitelistRow | null> {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("whitelist")
    .select("*")
    .ilike("email", email.toLowerCase());
  if (teamId) {
    query = query.eq("team_id", teamId);
  }

  const { data, error } = await query
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as WhitelistRow | null) ?? null;
}

export async function upsertWhitelistedUser(params: {
  authUserId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  teamId: string;
  role: "player" | "coach" | "admin";
}): Promise<UserRow> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("users")
    .upsert(
      {
        id: params.authUserId,
        email: params.email.toLowerCase(),
        display_name: params.displayName,
        avatar_url: params.avatarUrl,
        team_id: params.teamId,
        role: params.role,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data as UserRow;
}
