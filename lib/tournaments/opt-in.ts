import {
  VALORANT_ROLES,
  isValorantRole,
  normalizeSecondaryValorantRoles,
  type ValorantRole,
} from "../valorant/roles.ts";

export const ACTIVE_TOURNAMENT_OPT_IN_KEY = "surf-n-bulls-active-tournament";
export const TOURNAMENT_OPT_IN_OBJECT_TYPE = "tournament";
export const TOURNAMENT_ROSTER_LIMIT = 5;
export const TOURNAMENT_OPT_IN_VERBS = [
  "tournament_opted_in",
  "tournament_opted_out",
  "tournament_promoted",
  "tournament_demoted",
  "tournament_override",
] as const;

export type TournamentOptInIntent = "in" | "out";
export type TournamentOptInStatus = "active" | "waitlist" | "out";
export type TournamentOptInVerb = (typeof TOURNAMENT_OPT_IN_VERBS)[number];

export interface TournamentOptInMemberInput {
  id: string;
  display_name: string | null;
  email: string;
  avatar_url?: string | null;
  preferred_valorant_role?: string | null;
  secondary_valorant_roles?: unknown;
}

export interface TournamentOptInMember {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  preferredRole: ValorantRole | null;
  secondaryRoles: ValorantRole[];
  status: TournamentOptInStatus | null;
  updatedAt: string | null;
  waitlistPosition: number | null;
}

export interface TournamentOptInSummary {
  tournamentKey: string;
  rosterLimit: number;
  currentUserStatus: TournamentOptInStatus | null;
  currentUserWaitlistPosition: number | null;
  activeCount: number;
  waitlistCount: number;
  optedInCount: number;
  optedOutCount: number;
  pendingCount: number;
  totalCount: number;
  activeRoster: TournamentOptInMember[];
  waitlist: TournamentOptInMember[];
  roleWarnings: string[];
  members: TournamentOptInMember[];
}

export interface TournamentOptInEventInput {
  actor_id: string | null;
  verb: string;
  object_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

interface MemberState {
  status: TournamentOptInStatus | null;
  updatedAt: string | null;
}

export function buildTournamentOptInSummary({
  tournamentKey = ACTIVE_TOURNAMENT_OPT_IN_KEY,
  currentUserId,
  events = [],
  members,
  rosterLimit = TOURNAMENT_ROSTER_LIMIT,
}: {
  tournamentKey?: string;
  currentUserId: string;
  events?: TournamentOptInEventInput[];
  members: TournamentOptInMemberInput[];
  rosterLimit?: number;
}): TournamentOptInSummary {
  const membersById = new Map(
    members.map((member) => {
      const preferredRole = isValorantRole(member.preferred_valorant_role)
        ? member.preferred_valorant_role
        : null;
      return [
        member.id,
        {
          userId: member.id,
          displayName: member.display_name?.trim() || member.email.split("@")[0] || "Player",
          email: member.email,
          avatarUrl: member.avatar_url ?? null,
          preferredRole,
          secondaryRoles: normalizeSecondaryValorantRoles(
            preferredRole,
            member.secondary_valorant_roles,
          ),
        },
      ] as const;
    }),
  );
  const states = new Map<string, MemberState>();
  const activeIds: string[] = [];
  const waitlistIds: string[] = [];

  for (const member of membersById.values()) {
    states.set(member.userId, { status: null, updatedAt: null });
  }

  for (const event of [...events].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (event.object_id !== tournamentKey) continue;

    const override = readOverride(event);
    if (override) {
      applyOverride({
        activeIds,
        event,
        membersById,
        promotedUserId: override.promotedUserId,
        demotedUserId: override.demotedUserId,
        states,
        waitlistIds,
      });
      continue;
    }

    const targetUserId = readEventTargetUserId(event);
    if (!targetUserId || !membersById.has(targetUserId)) continue;
    const intent = readIntent(event);
    if (intent === "in") {
      const currentStatus = states.get(targetUserId)?.status ?? null;
      if (currentStatus === "active" || currentStatus === "waitlist") continue;
      removeId(waitlistIds, targetUserId);
      removeId(activeIds, targetUserId);
      if (activeIds.length < rosterLimit) {
        activeIds.push(targetUserId);
        states.set(targetUserId, { status: "active", updatedAt: event.created_at });
      } else {
        waitlistIds.push(targetUserId);
        states.set(targetUserId, { status: "waitlist", updatedAt: event.created_at });
      }
    } else if (intent === "out") {
      const wasActive = activeIds.includes(targetUserId);
      removeId(activeIds, targetUserId);
      removeId(waitlistIds, targetUserId);
      states.set(targetUserId, { status: "out", updatedAt: event.created_at });
      if (wasActive) {
        promoteBestWaitlistedPlayer({
          activeIds,
          createdAt: event.created_at,
          membersById,
          rosterLimit,
          states,
          waitlistIds,
        });
      }
    }
  }

  const waitlistPositions = new Map(waitlistIds.map((userId, index) => [userId, index + 1]));
  const normalizedMembers = [...membersById.values()]
    .map((member) => {
      const state = states.get(member.userId);
      return {
        ...member,
        status: state?.status ?? null,
        updatedAt: state?.updatedAt ?? null,
        waitlistPosition: waitlistPositions.get(member.userId) ?? null,
      };
    })
    .sort(sortOptInMembers);
  const byId = new Map(normalizedMembers.map((member) => [member.userId, member]));
  const activeRoster = activeIds.flatMap((userId) => byId.get(userId) ?? []);
  const waitlist = waitlistIds.flatMap((userId) => byId.get(userId) ?? []);
  const currentUser = byId.get(currentUserId) ?? null;

  return {
    tournamentKey,
    rosterLimit,
    currentUserStatus: currentUser?.status ?? null,
    currentUserWaitlistPosition: currentUser?.waitlistPosition ?? null,
    activeCount: activeRoster.length,
    waitlistCount: waitlist.length,
    optedInCount: activeRoster.length + waitlist.length,
    optedOutCount: normalizedMembers.filter((member) => member.status === "out").length,
    pendingCount: normalizedMembers.filter((member) => member.status === null).length,
    totalCount: normalizedMembers.length,
    activeRoster,
    waitlist,
    roleWarnings: buildRoleWarnings(activeRoster),
    members: normalizedMembers,
  };
}

export function optInStatusToVerb(status: TournamentOptInIntent): TournamentOptInVerb {
  return status === "in" ? "tournament_opted_in" : "tournament_opted_out";
}

function applyOverride({
  activeIds,
  demotedUserId,
  event,
  membersById,
  promotedUserId,
  states,
  waitlistIds,
}: {
  activeIds: string[];
  demotedUserId: string | null;
  event: TournamentOptInEventInput;
  membersById: Map<string, { userId: string }>;
  promotedUserId: string | null;
  states: Map<string, MemberState>;
  waitlistIds: string[];
}) {
  if (!promotedUserId || !membersById.has(promotedUserId)) return;
  if (demotedUserId && demotedUserId !== promotedUserId && membersById.has(demotedUserId)) {
    removeId(activeIds, demotedUserId);
    removeId(waitlistIds, demotedUserId);
    waitlistIds.push(demotedUserId);
    states.set(demotedUserId, { status: "waitlist", updatedAt: event.created_at });
  }

  removeId(waitlistIds, promotedUserId);
  removeId(activeIds, promotedUserId);
  activeIds.push(promotedUserId);
  states.set(promotedUserId, { status: "active", updatedAt: event.created_at });
}

function promoteBestWaitlistedPlayer({
  activeIds,
  createdAt,
  membersById,
  rosterLimit,
  states,
  waitlistIds,
}: {
  activeIds: string[];
  createdAt: string;
  membersById: Map<
    string,
    {
      preferredRole: ValorantRole | null;
      secondaryRoles: ValorantRole[];
      userId: string;
    }
  >;
  rosterLimit: number;
  states: Map<string, MemberState>;
  waitlistIds: string[];
}) {
  if (activeIds.length >= rosterLimit || waitlistIds.length === 0) return;
  const promotedUserId = chooseBestWaitlistedPlayer(activeIds, waitlistIds, membersById);
  if (!promotedUserId) return;
  removeId(waitlistIds, promotedUserId);
  activeIds.push(promotedUserId);
  states.set(promotedUserId, { status: "active", updatedAt: createdAt });
}

function chooseBestWaitlistedPlayer(
  activeIds: string[],
  waitlistIds: string[],
  membersById: Map<
    string,
    {
      preferredRole: ValorantRole | null;
      secondaryRoles: ValorantRole[];
    }
  >,
) {
  const neededRoles = leastCoveredRoles(activeIds, membersById);
  return [...waitlistIds].sort((left, right) => {
    const leftFit = roleFitScore(membersById.get(left), neededRoles);
    const rightFit = roleFitScore(membersById.get(right), neededRoles);
    if (leftFit !== rightFit) return leftFit - rightFit;
    return waitlistIds.indexOf(left) - waitlistIds.indexOf(right);
  })[0] ?? null;
}

function leastCoveredRoles(
  activeIds: string[],
  membersById: Map<string, { preferredRole: ValorantRole | null }>,
) {
  const counts = roleCounts(activeIds.flatMap((userId) => membersById.get(userId) ?? []));
  const lowest = Math.min(...VALORANT_ROLES.map((role) => counts[role]));
  return VALORANT_ROLES.filter((role) => counts[role] === lowest);
}

function roleFitScore(
  member: { preferredRole: ValorantRole | null; secondaryRoles: ValorantRole[] } | undefined,
  neededRoles: ValorantRole[],
) {
  if (!member) return 999;
  if (member.preferredRole && neededRoles.includes(member.preferredRole)) {
    return neededRoles.indexOf(member.preferredRole);
  }
  const secondaryIndex = neededRoles.findIndex((role) => member.secondaryRoles.includes(role));
  if (secondaryIndex >= 0) return 100 + secondaryIndex;
  return 999;
}

function buildRoleWarnings(activeRoster: TournamentOptInMember[]) {
  if (activeRoster.length === 0) return [];
  const counts = roleCounts(activeRoster);
  const warnings = VALORANT_ROLES.flatMap((role) => {
    if (counts[role] === 0) return [`No ${role} in locked roster`];
    if (counts[role] >= 3) return [`${counts[role]} ${role}s in locked roster`];
    return [];
  });
  const missingRoleCount = activeRoster.filter((member) => !member.preferredRole).length;
  if (missingRoleCount > 0) {
    warnings.push(`${missingRoleCount} locked player${missingRoleCount === 1 ? "" : "s"} missing role preference`);
  }
  return warnings;
}

function roleCounts(members: Array<{ preferredRole: ValorantRole | null }>) {
  const counts = Object.fromEntries(VALORANT_ROLES.map((role) => [role, 0])) as Record<ValorantRole, number>;
  for (const member of members) {
    if (member.preferredRole) counts[member.preferredRole] += 1;
  }
  return counts;
}

function readIntent(event: TournamentOptInEventInput): TournamentOptInIntent | null {
  const payloadStatus = event.payload?.status;
  if (payloadStatus === "in" || payloadStatus === "out") return payloadStatus;
  if (event.verb === "tournament_opted_in") return "in";
  if (event.verb === "tournament_opted_out") return "out";
  return null;
}

function readOverride(event: TournamentOptInEventInput) {
  if (event.verb !== "tournament_override" && event.verb !== "tournament_promoted") {
    return null;
  }
  return {
    promotedUserId: readPayloadString(event.payload, ["promoted_user_id", "user_id"]),
    demotedUserId: readPayloadString(event.payload, ["demoted_user_id", "replace_user_id"]),
  };
}

function readEventTargetUserId(event: TournamentOptInEventInput) {
  return readPayloadString(event.payload, ["user_id"]) ?? event.actor_id;
}

function readPayloadString(payload: Record<string, unknown> | null, keys: string[]) {
  if (!payload) return null;
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function sortOptInMembers(a: TournamentOptInMember, b: TournamentOptInMember) {
  const statusOrder = statusRank(a.status) - statusRank(b.status);
  if (statusOrder !== 0) return statusOrder;
  if (a.waitlistPosition !== null && b.waitlistPosition !== null) {
    return a.waitlistPosition - b.waitlistPosition;
  }
  return a.displayName.localeCompare(b.displayName);
}

function statusRank(status: TournamentOptInStatus | null) {
  if (status === "active") return 0;
  if (status === "waitlist") return 1;
  if (status === null) return 2;
  return 3;
}

function removeId(ids: string[], id: string) {
  const index = ids.indexOf(id);
  if (index >= 0) ids.splice(index, 1);
}
