import "server-only";
import { TEAMS, type TeamSlug } from "@/lib/constants";
import type { TeamRow, UserRow } from "@/types/domain";

export const VIP_SESSION_COOKIE = "vip_agent_session";

export function encodeVipSession(value: { userId: string; teamId: string }) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function decodeVipSession(raw: string | undefined) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as {
      userId?: string;
      teamId?: string;
    };
    if (!parsed.userId || !parsed.teamId) return null;
    return { userId: parsed.userId, teamId: parsed.teamId };
  } catch {
    return null;
  }
}

const VIP_EMAILS: Record<TeamSlug, string> = {
  "surf-n-bulls": "vip+surf-n-bulls@example.com",
  molgarians: "vip+molgarians@example.com",
};

const VIP_USER_IDS: Record<TeamSlug, string> = {
  "surf-n-bulls": "00000000-0000-0000-0000-00000000a001",
  molgarians: "00000000-0000-0000-0000-00000000a002",
};

export function buildVipSession(teamSlug: TeamSlug): { user: UserRow; team: TeamRow } {
  const team = TEAMS[teamSlug];
  return {
    user: {
      id: VIP_USER_IDS[teamSlug],
      email: VIP_EMAILS[teamSlug],
      display_name: `${team.name} VIP`,
      avatar_url: null,
      team_id: team.id,
      role: "admin",
      riot_name: null,
      riot_tag: null,
      riot_region: "eu",
      status: "online",
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString(),
    },
    team: {
      id: team.id,
      slug: team.slug,
      name: team.name,
      accent_color: team.accentHex,
      logo_url: null,
      motto: team.motto,
      created_at: new Date(0).toISOString(),
    },
  };
}
