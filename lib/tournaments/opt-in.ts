import type { TournamentOptInRow } from "@/types/domain";

export const ACTIVE_TOURNAMENT_OPT_IN_KEY = "surf-n-bulls-active-tournament";

export type TournamentOptInStatus = "in" | "out";

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

export function buildTournamentOptInSummary({
  tournamentKey = ACTIVE_TOURNAMENT_OPT_IN_KEY,
  currentUserId,
  members,
  optIns,
}: {
  tournamentKey?: string;
  currentUserId: string;
  members: TournamentOptInMemberInput[];
  optIns: Array<Pick<TournamentOptInRow, "user_id" | "status" | "updated_at">>;
}): TournamentOptInSummary {
  const optInsByUser = new Map(optIns.map((optIn) => [optIn.user_id, optIn]));
  const normalizedMembers = members
    .map((member) => {
      const optIn = optInsByUser.get(member.id) ?? null;
      return {
        userId: member.id,
        displayName: member.display_name?.trim() || member.email.split("@")[0] || "Player",
        email: member.email,
        avatarUrl: member.avatar_url ?? null,
        status: optIn?.status ?? null,
        updatedAt: optIn?.updated_at ?? null,
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
