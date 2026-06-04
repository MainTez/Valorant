import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRow } from "@/types/domain";

export const runtime = "nodejs";

const AccountPayload = z.object({
  display_name: z.string().trim().min(1).max(48),
  avatar_url: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => value || null)
    .pipe(z.string().url().nullable()),
});

export async function PATCH(request: NextRequest) {
  try {
    const { user } = await requireSession();
    const body = AccountPayload.parse(await request.json());
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("users")
      .update({
        display_name: body.display_name,
        avatar_url: body.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select("display_name, avatar_url")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const row = data as Pick<UserRow, "display_name" | "avatar_url">;
    return NextResponse.json({
      data: {
        display_name: row.display_name,
        avatar_url: row.avatar_url,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Enter a username and a valid image URL." },
        { status: 400 },
      );
    }
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}
