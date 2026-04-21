import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { WhitelistRow } from "@/types/domain";

export async function findWhitelistEntry(email: string): Promise<WhitelistRow | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("whitelist")
    .select("*")
    .ilike("email", email)
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
}) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("users").upsert(
    {
      id: params.authUserId,
      email: params.email,
      display_name: params.displayName,
      avatar_url: params.avatarUrl,
      team_id: params.teamId,
      role: params.role,
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}
