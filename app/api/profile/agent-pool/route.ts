import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  AGENT_POOL_OBJECT_TYPE,
  AGENT_POOL_UPDATED_VERB,
  normalizeAgentPool,
} from "@/lib/valorant/agent-pool";

export const runtime = "nodejs";

const AgentPoolPayload = z.object({
  agent_pool: z.unknown(),
});

export async function PATCH(request: NextRequest) {
  try {
    const { user, team } = await requireSession();
    const body = AgentPoolPayload.parse(await request.json());
    const agentPool = normalizeAgentPool(body.agent_pool);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.from("activity_events").insert({
      team_id: team.id,
      actor_id: user.id,
      verb: AGENT_POOL_UPDATED_VERB,
      object_type: AGENT_POOL_OBJECT_TYPE,
      object_id: user.id,
      payload: { agent_pool: agentPool },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: { agent_pool: agentPool } });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}
