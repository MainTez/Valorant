import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decodeVipSession, VIP_SESSION_COOKIE } from "@/lib/auth/vip";
import type { UserRow, TeamRow } from "@/types/domain";

export interface SessionContext {
  user: UserRow;
  team: TeamRow;
}

/**
 * Server-side helper: returns the authed user + team, or null if not signed in
 * or not yet onboarded into the `public.users` table.
 * Cached per-request via React cache().
 */
export const getSessionUser = cache(async (): Promise<SessionContext | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  let userId = authUser?.id ?? null;

  if (!userId) {
    const cookieStore = await cookies();
    const vipSession = decodeVipSession(cookieStore.get(VIP_SESSION_COOKIE)?.value);
    userId = vipSession?.userId ?? null;
  }

  if (!userId) return null;

  const { data: userRow } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!userRow) return null;

  const { data: teamRow } = await supabase
    .from("teams")
    .select("*")
    .eq("id", userRow.team_id)
    .maybeSingle();

  if (!teamRow) return null;

  return { user: userRow as UserRow, team: teamRow as TeamRow };
});

export async function requireSession(): Promise<SessionContext> {
  const ctx = await getSessionUser();
  if (!ctx) {
    const err = new Error("Unauthorized");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }
  return ctx;
}

export async function requireAdmin(): Promise<SessionContext> {
  const ctx = await requireSession();
  if (ctx.user.role !== "admin") {
    const err = new Error("Forbidden");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  return ctx;
}

export async function requireCoachOrAdmin(): Promise<SessionContext> {
  const ctx = await requireSession();
  if (ctx.user.role !== "coach" && ctx.user.role !== "admin") {
    const err = new Error("Forbidden");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  return ctx;
}
