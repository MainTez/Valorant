import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VIP_SESSION_COOKIE } from "@/lib/auth/vip";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const response = NextResponse.json({ ok: true });
  // Clear legacy VIP cookie if any client still has it set.
  response.cookies.set(VIP_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  });
  return response;
}
