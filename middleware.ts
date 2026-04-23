import { type NextRequest, NextResponse } from "next/server";
import { isPublicPath } from "@/lib/auth/public-paths";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const hasAccess = Boolean(user);

  const { pathname } = request.nextUrl;
  const isPublic = isPublicPath(pathname);

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
