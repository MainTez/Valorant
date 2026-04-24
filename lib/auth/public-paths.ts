export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/profile/riot" ||
    pathname.startsWith("/api/cron/") ||
    pathname === "/favicon.ico"
  );
}
