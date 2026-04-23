import "server-only";
import type { TeamSlug } from "@/lib/constants";

export {
  VIP_SESSION_COOKIE,
  VIP_EMAILS,
  VIP_USER_IDS,
  isVipEmail,
} from "@/lib/auth/vip-config";

// Deterministic passwords for the per-team VIP agent accounts. Kept in a
// server-only module because they back real Supabase Auth users that are
// privileged (team admin). Never import this from client components.
export const VIP_PASSWORDS: Record<TeamSlug, string> = {
  "surf-n-bulls": "vip-surf-n-bulls-access",
  molgarians: "vip-molgarians-access",
};
