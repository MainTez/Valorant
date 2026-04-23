import type { TeamSlug } from "@/lib/constants";

// Pure constants + helpers for VIP agent accounts. Kept free of `server-only`
// so unit tests can import without the Next bundler. Anything involving
// passwords or admin-only flows belongs in `lib/auth/vip.ts`, which is
// explicitly server-scoped.

export const VIP_SESSION_COOKIE = "vip_agent_session";

export const VIP_EMAILS: Record<TeamSlug, string> = {
  "surf-n-bulls": "vip+surf-n-bulls@example.com",
  molgarians: "vip+molgarians@example.com",
};

export const VIP_USER_IDS: Record<TeamSlug, string> = {
  "surf-n-bulls": "00000000-0000-0000-0000-00000000a001",
  molgarians: "00000000-0000-0000-0000-00000000a002",
};

export function isVipEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return Object.values(VIP_EMAILS).some((vip) => vip.toLowerCase() === lower);
}
