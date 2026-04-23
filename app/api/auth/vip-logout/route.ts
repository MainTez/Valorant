import { NextResponse } from "next/server";
import { VIP_SESSION_COOKIE } from "@/lib/auth/vip";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(VIP_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  });
  return response;
}
