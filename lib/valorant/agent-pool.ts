import {
  VALORANT_AGENT_NAMES,
  getAgentAsset,
  type ValorantAgentName,
} from "./assets.ts";
import {
  VALORANT_ROLES,
  isValorantRole,
  normalizeSecondaryValorantRoles,
  type ValorantRole,
} from "./roles.ts";

export const AGENT_POOL_OBJECT_TYPE = "valorant_agent_pool";
export const AGENT_POOL_UPDATED_VERB = "valorant_agent_pool_updated";

export type ValorantAgentPool = Record<ValorantRole, ValorantAgentName[]>;

export interface AgentPoolMemberInput {
  id: string;
  display_name: string | null;
  email: string;
}

export interface AgentPoolEventInput {
  actor_id: string | null;
  verb: string;
  object_type: string | null;
  object_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface PlayerAgentPoolSummary {
  userId: string;
  displayName: string;
  agentPool: ValorantAgentPool;
  updatedAt: string | null;
}

export interface AgentCompRosterMember {
  userId: string;
  displayName: string;
  preferredRole: ValorantRole | null;
  secondaryRoles: ValorantRole[];
}

export interface AgentCompAssignment {
  userId: string;
  displayName: string;
  assignedRole: ValorantRole | null;
  agent: ValorantAgentName | null;
  agentRole: ValorantRole | null;
  poolSize: number;
}

export interface AgentCompSuggestion {
  assignments: AgentCompAssignment[];
  warnings: string[];
}

const agentByLower = new Map(
  VALORANT_AGENT_NAMES.map((agent) => [agent.toLowerCase(), agent] as const),
);

export function emptyAgentPool(): ValorantAgentPool {
  return {
    Controller: [],
    Duelist: [],
    Initiator: [],
    Sentinel: [],
  };
}

export function normalizeAgentPool(input: unknown): ValorantAgentPool {
  const pool = emptyAgentPool();
  if (!input || typeof input !== "object" || Array.isArray(input)) return pool;

  const rawPool = input as Record<string, unknown>;
  for (const role of VALORANT_ROLES) {
    const agents = rawPool[role];
    if (!Array.isArray(agents)) continue;

    for (const rawAgent of agents) {
      const agent = normalizeAgentName(rawAgent);
      if (!agent || pool[role].includes(agent)) continue;
      if (getAgentAsset(agent)?.role !== role) continue;
      pool[role].push(agent);
    }
  }

  return pool;
}

export function hasAgentPool(pool: ValorantAgentPool): boolean {
  return VALORANT_ROLES.some((role) => pool[role].length > 0);
}

export function normalizeAgentName(agent: unknown): ValorantAgentName | null {
  if (typeof agent !== "string") return null;
  const trimmed = agent.trim();
  if (!trimmed) return null;
  return agentByLower.get(trimmed.toLowerCase()) ?? null;
}

export function buildPlayerAgentPools({
  events,
  members,
}: {
  events: AgentPoolEventInput[];
  members: AgentPoolMemberInput[];
}): PlayerAgentPoolSummary[] {
  const byUserId = new Map<string, PlayerAgentPoolSummary>(
    members.map((member) => [
      member.id,
      {
        agentPool: emptyAgentPool(),
        displayName: member.display_name?.trim() || member.email.split("@")[0] || "Player",
        updatedAt: null,
        userId: member.id,
      } satisfies PlayerAgentPoolSummary,
    ]),
  );

  for (const event of [...events].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (!isAgentPoolEvent(event)) continue;
    const userId = event.object_id ?? event.actor_id;
    if (!userId || !byUserId.has(userId)) continue;

    const summary = byUserId.get(userId);
    if (!summary) continue;
    summary.agentPool = normalizeAgentPool(event.payload?.agent_pool);
    summary.updatedAt = event.created_at;
  }

  return [...byUserId.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function buildAgentPoolMap(summaries: PlayerAgentPoolSummary[]) {
  return new Map(summaries.map((summary) => [summary.userId, summary.agentPool] as const));
}

export function buildSuggestedAgentComp({
  agentPools,
  roster,
}: {
  agentPools: PlayerAgentPoolSummary[] | Map<string, ValorantAgentPool>;
  roster: AgentCompRosterMember[];
}): AgentCompSuggestion {
  const poolByUserId = Array.isArray(agentPools) ? buildAgentPoolMap(agentPools) : agentPools;
  const usedAgents = new Set<string>();
  const assignments = roster.map((member) => {
    const pool = poolByUserId.get(member.userId) ?? emptyAgentPool();
    const preferredRole = isValorantRole(member.preferredRole) ? member.preferredRole : null;
    const roleOrder = uniqueRoles([
      preferredRole,
      ...normalizeSecondaryValorantRoles(preferredRole, member.secondaryRoles),
      ...VALORANT_ROLES,
    ]);
    const picked = pickAgentForMember(pool, roleOrder, usedAgents);
    if (picked.agent) usedAgents.add(picked.agent);

    return {
      userId: member.userId,
      displayName: member.displayName,
      assignedRole: picked.role ?? preferredRole,
      agent: picked.agent,
      agentRole: picked.agent ? getAgentAsset(picked.agent)?.role ?? null : null,
      poolSize: VALORANT_ROLES.reduce((sum, role) => sum + pool[role].length, 0),
    } satisfies AgentCompAssignment;
  });

  return {
    assignments,
    warnings: buildCompWarnings(assignments),
  };
}

function isAgentPoolEvent(event: AgentPoolEventInput) {
  return event.object_type === AGENT_POOL_OBJECT_TYPE && event.verb === AGENT_POOL_UPDATED_VERB;
}

function pickAgentForMember(
  pool: ValorantAgentPool,
  roleOrder: ValorantRole[],
  usedAgents: Set<string>,
) {
  for (const role of roleOrder) {
    const unusedAgent = pool[role].find((agent) => !usedAgents.has(agent));
    if (unusedAgent) return { agent: unusedAgent, role };
  }

  for (const role of roleOrder) {
    const fallbackAgent = pool[role][0] ?? null;
    if (fallbackAgent) return { agent: fallbackAgent, role };
  }

  return { agent: null, role: null };
}

function uniqueRoles(roles: Array<ValorantRole | null>): ValorantRole[] {
  const unique: ValorantRole[] = [];
  for (const role of roles) {
    if (!role || unique.includes(role)) continue;
    unique.push(role);
  }
  return unique;
}

function buildCompWarnings(assignments: AgentCompAssignment[]) {
  const warnings: string[] = [];
  const missingPoolCount = assignments.filter((assignment) => assignment.poolSize === 0).length;
  const unassignedCount = assignments.filter((assignment) => !assignment.agent).length;

  for (const role of VALORANT_ROLES) {
    if (!assignments.some((assignment) => assignment.assignedRole === role)) {
      warnings.push(`No ${role} selected`);
    }
  }

  if (missingPoolCount > 0) {
    warnings.push(`${missingPoolCount} player${missingPoolCount === 1 ? "" : "s"} missing agent pool`);
  }

  if (unassignedCount > 0) {
    warnings.push(`${unassignedCount} player${unassignedCount === 1 ? "" : "s"} need an agent pick`);
  }

  return warnings;
}
