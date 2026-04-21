import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("henrik_cache")
      .select("payload,expires_at")
      .eq("endpoint_key", key)
      .maybeSingle();
    if (!data) return null;
    if (new Date(data.expires_at as string).getTime() < Date.now()) return null;
    return data.payload as T;
  } catch {
    return null;
  }
}

export async function setCached(
  key: string,
  payload: unknown,
  ttlSeconds: number,
): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    await admin.from("henrik_cache").upsert({
      endpoint_key: key,
      payload: payload as object,
      expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    });
  } catch {
    // cache best-effort; never block API responses
  }
}
