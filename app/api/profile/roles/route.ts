import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VALORANT_ROLES } from "@/lib/valorant/roles";
import type { UserRow } from "@/types/domain";

export const runtime = "nodejs";

const RolePayload = z.object({
  preferred_role: z.enum(VALORANT_ROLES),
  secondary_roles: z.array(z.enum(VALORANT_ROLES)).default([]),
});

export async function PATCH(request: NextRequest) {
  try {
    const { user } = await requireSession();
    const body = RolePayload.parse(await request.json());
    const secondaryRoles = [...new Set(body.secondary_roles)].filter(
      (role) => role !== body.preferred_role,
    );
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("users")
      .update({
        preferred_valorant_role: body.preferred_role,
        secondary_valorant_roles: secondaryRoles,
      })
      .eq("id", user.id)
      .select("preferred_valorant_role, secondary_valorant_roles")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const row = data as Pick<UserRow, "preferred_valorant_role" | "secondary_valorant_roles">;
    return NextResponse.json({
      data: {
        preferred_role: row.preferred_valorant_role,
        secondary_roles: row.secondary_valorant_roles,
      },
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}
