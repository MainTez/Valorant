export const ACTIVE_TOURNAMENT_OPT_IN_KEY = "surf-n-bulls-active-tournament";
export const TOURNAMENT_OPT_IN_OBJECT_TYPE = "tournament";
export const TOURNAMENT_OPT_IN_VERBS = [
  "tournament_opted_in",
  "tournament_opted_out",
] as const;

export type TournamentOptInStatus = "in" | "out";
export type TournamentOptInVerb = (typeof TOURNAMENT_OPT_IN_VERBS)[number];

export interface TournamentOptInMemberInput {
  id: string;
  display_name: string | null;
  email: string;
  avatar_url?: string | null;
}

export interface TournamentOptInMember {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  status: TournamentOptInStatus | null;
  updatedAt: string | null;
}

export interface TournamentOptInSummary {
  tournamentKey: string;
  currentUserStatus: TournamentOptInStatus | null;
  optedInCount: number;
  optedOutCount: number;
  pendingCount: number;
  totalCount: number;
  members: TournamentOptInMember[];
}

export interface TournamentOptInEventInput {
  actor_id: string | null;
  verb: string;
  object_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export function buildTournamentOptInSummary({
  tournamentKey = ACTIVE_TOURNAMENT_OPT_IN_KEY,
  currentUserId,
  events = [],
  members,
}: {
  tournamentKey?: string;
  currentUserId: string;
  events?: TournamentOptInEventInput[];
  members: TournamentOptInMemberInput[];
}): TournamentOptInSummary {
  const optInsByUser = latestOptInsByUser(events, tournamentKey);
  const normalizedMembers = members
    .map((member) => {
      const optIn = optInsByUser.get(member.id) ?? null;
      return {
        userId: member.id,
        displayName: member.display_name?.trim() || member.email.split("@")[0] || "Player",
        email: member.email,
        avatarUrl: member.avatar_url ?? null,
        status: optIn?.status ?? null,
        updatedAt: optIn?.updatedAt ?? null,
      };
    })
    .sort(sortOptInMembers);

  return {
    tournamentKey,
    currentUserStatus: optInsByUser.get(currentUserId)?.status ?? null,
    optedInCount: normalizedMembers.filter((member) => member.status === "in").length,
    optedOutCount: normalizedMembers.filter((member) => member.status === "out").length,
    pendingCount: normalizedMembers.filter((member) => member.status === null).length,
    totalCount: normalizedMembers.length,
    members: normalizedMembers,
  };
}

export function optInStatusToVerb(status: TournamentOptInStatus): TournamentOptInVerb {
  return status === "in" ? "tournament_opted_in" : "tournament_opted_out";
}

function latestOptInsByUser(events: TournamentOptInEventInput[], tournamentKey: string) {
  const out = new Map<string, { status: TournamentOptInStatus; updatedAt: string }>();

  for (const event of events) {
    if (!event.actor_id) continue;
    if (event.object_id !== tournamentKey) continue;

    const status = readStatus(event);
    if (!status) continue;

    const existing = out.get(event.actor_id);
    if (existing && existing.updatedAt > event.created_at) continue;
    out.set(event.actor_id, { status, updatedAt: event.created_at });
  }

  return out;
}

function readStatus(event: TournamentOptInEventInput): TournamentOptInStatus | null {
  const payloadStatus = event.payload?.status;
  if (payloadStatus === "in" || payloadStatus === "out") return payloadStatus;
  if (event.verb === "tournament_opted_in") return "in";
  if (event.verb === "tournament_opted_out") return "out";
  return null;
}

function sortOptInMembers(a: TournamentOptInMember, b: TournamentOptInMember) {
  const statusOrder = statusRank(a.status) - statusRank(b.status);
  if (statusOrder !== 0) return statusOrder;
  return a.displayName.localeCompare(b.displayName);
}

function statusRank(status: TournamentOptInStatus | null) {
  if (status === "in") return 0;
  if (status === null) return 1;
  return 2;
}
