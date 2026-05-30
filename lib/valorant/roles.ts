export const VALORANT_ROLES = [
  "Duelist",
  "Sentinel",
  "Initiator",
  "Controller",
] as const;

export type ValorantRole = (typeof VALORANT_ROLES)[number];

const roleSet = new Set<string>(VALORANT_ROLES);

export function isValorantRole(value: unknown): value is ValorantRole {
  return typeof value === "string" && roleSet.has(value);
}

export function normalizeSecondaryValorantRoles(
  preferredRole: ValorantRole | null,
  roles: unknown,
): ValorantRole[] {
  if (!Array.isArray(roles)) return [];
  const normalized: ValorantRole[] = [];

  for (const role of roles) {
    if (!isValorantRole(role)) continue;
    if (role === preferredRole) continue;
    if (normalized.includes(role)) continue;
    normalized.push(role);
  }

  return normalized;
}

export function roleLabel(role: ValorantRole | null) {
  return role ?? "No role";
}
