import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { henrikAccount, henrikMMR } from "@/lib/henrik/client";
import { normalizeAccount, normalizeMMR } from "@/lib/henrik/normalize";
import { defaultRegion, normalizeRegion } from "@/lib/henrik/regions";

export const runtime = "nodejs";

const Payload = z.object({
  name: z.string().trim().min(1).max(32),
  tag: z.string().trim().min(1).max(16),
  region: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, team } = session;

  let body: z.infer<typeof Payload>;
  try {
    body = Payload.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Enter a Riot name and tag." }, { status: 400 });
  }

  const region = normalizeRegion(body.region ?? defaultRegion());
  const tag = body.tag.replace(/^#/, "");

  let account;
  try {
    account = normalizeAccount(await henrikAccount(body.name, tag));
    if (!account) {
      return NextResponse.json({ error: "Riot account not found." }, { status: 404 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not verify Riot account.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  let mmr = null;
  try {
    mmr = normalizeMMR(await henrikMMR(account.name, account.tag, region));
  } catch {
    // Rank can be filled by the tracker/cron later; account linking only needs identity.
  }

  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { error: userError } = await admin
    .from("users")
    .update({
      riot_name: account.name,
      riot_tag: account.tag,
      riot_region: region,
      updated_at: now,
    })
    .eq("id", user.id);

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  await admin
    .from("player_profiles")
    .update({ user_id: null })
    .eq("user_id", user.id);

  const { data: profile, error: profileError } = await admin
    .from("player_profiles")
    .upsert(
      {
        user_id: user.id,
        team_id: team.id,
        riot_name: account.name,
        riot_tag: account.tag,
        region,
        puuid: account.puuid,
        current_rank: mmr?.currentTier ?? null,
        current_rr: mmr?.currentRR ?? null,
        peak_rank: mmr?.peakTier ?? null,
        last_synced_at: now,
      },
      { onConflict: "riot_name,riot_tag" },
    )
    .select("id, riot_name, riot_tag, region, current_rank, current_rr")
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: profileError?.message ?? "Could not save profile." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: {
      profile,
      riot_name: account.name,
      riot_tag: account.tag,
      riot_region: region,
    },
  });
}
