import { type NextRequest, NextResponse } from "next/server";
import { VIP_SESSION_COOKIE } from "@/lib/auth/vip";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const hasVipSession = Boolean(request.cookies.get(VIP_SESSION_COOKIE)?.value);
  const hasAccess = Boolean(user) || hasVipSession;

  const { pathname } = request.nextUrl;
  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/cron/") ||
    pathname === "/favicon.ico";

  if (!hasAccess && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (hasAccess && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|avif|ico|txt)).*)",
  ],
};
