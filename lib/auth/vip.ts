import "server-only";

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
