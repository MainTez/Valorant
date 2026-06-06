export const TOURNAMENT_MATCH_PREP_OBJECT_TYPE = "tournament_match_prep";

export const TOURNAMENT_MATCH_PREP_VERBS = [
  "tournament_prep_notes_updated",
  "tournament_prep_ready_updated",
  "tournament_prep_checklist_updated",
] as const;

export type TournamentMatchPrepVerb = (typeof TOURNAMENT_MATCH_PREP_VERBS)[number];

export const TOURNAMENT_MATCH_PREP_CHECKLIST = [
  {
    id: "locked_roster",
    label: "Locked five confirmed",
    detail: "Roster is locked and every player knows if they are playing.",
  },
  {
    id: "roles_checked",
    label: "Roles checked",
    detail: "Duelist, Sentinel, Initiator, and Controller coverage is clear.",
  },
  {
    id: "opponent_scouted",
    label: "Opponent scouted",
    detail: "Table position, recent results, and roster notes have been reviewed.",
  },
  {
    id: "map_notes",
    label: "Map notes ready",
    detail: "Default map plan, pistol focus, and anti-strat notes are written.",
  },
  {
    id: "comms_ready",
    label: "Comms ready",
    detail: "Lobby time, Discord channel, and backup player plan are clear.",
  },
] as const;

export type TournamentMatchPrepChecklistId =
  (typeof TOURNAMENT_MATCH_PREP_CHECKLIST)[number]["id"];

export interface TournamentMatchPrepEventInput {
  actor_id: string | null;
  verb: string;
  object_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface TournamentMatchPrepRosterMember {
  userId: string;
}

export interface TournamentMatchPrepReadyState {
  ready: boolean;
  updatedAt: string | null;
}

export interface TournamentMatchPrepChecklistItem {
  id: TournamentMatchPrepChecklistId;
  label: string;
  detail: string;
  checked: boolean;
  updatedAt: string | null;
}

export interface TournamentMatchPrepSummary {
  matchupKey: string;
  notes: string;
  notesUpdatedAt: string | null;
  readyByUserId: Record<string, TournamentMatchPrepReadyState>;
  readyCount: number;
  rosterCount: number;
  allReady: boolean;
  checklist: TournamentMatchPrepChecklistItem[];
  checklistDoneCount: number;
  checklistTotalCount: number;
}

export function buildTournamentMatchPrepSummary({
  events = [],
  matchupKey,
  roster,
}: {
  events?: TournamentMatchPrepEventInput[];
  matchupKey: string;
  roster: TournamentMatchPrepRosterMember[];
}): TournamentMatchPrepSummary {
  let notes = "";
  let notesUpdatedAt: string | null = null;
  const readyByUserId = Object.fromEntries(
    roster.map((member) => [
      member.userId,
      { ready: false, updatedAt: null } satisfies TournamentMatchPrepReadyState,
    ]),
  ) as Record<string, TournamentMatchPrepReadyState>;
  const checkedByItemId = new Map<TournamentMatchPrepChecklistId, string | null>(
    TOURNAMENT_MATCH_PREP_CHECKLIST.map((item) => [item.id, null]),
  );

  for (const event of [...events].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (event.object_id !== matchupKey) continue;

    if (event.verb === "tournament_prep_notes_updated") {
      notes = readString(event.payload, "notes") ?? "";
      notesUpdatedAt = event.created_at;
      continue;
    }

    if (event.verb === "tournament_prep_ready_updated") {
      const userId = readString(event.payload, "user_id") ?? event.actor_id;
      if (!userId || !(userId in readyByUserId)) continue;
      readyByUserId[userId] = {
        ready: readBoolean(event.payload, "ready") ?? false,
        updatedAt: event.created_at,
      };
      continue;
    }

    if (event.verb === "tournament_prep_checklist_updated") {
      const itemId = readChecklistId(event.payload);
      if (!itemId) continue;
      checkedByItemId.set(itemId, readBoolean(event.payload, "checked") ? event.created_at : null);
    }
  }

  const checklist = TOURNAMENT_MATCH_PREP_CHECKLIST.map((item) => {
    const updatedAt = checkedByItemId.get(item.id) ?? null;
    return {
      ...item,
      checked: updatedAt !== null,
      updatedAt,
    };
  });
  const readyStates = Object.values(readyByUserId);
  const readyCount = readyStates.filter((state) => state.ready).length;
  const rosterCount = roster.length;
  const checklistDoneCount = checklist.filter((item) => item.checked).length;

  return {
    matchupKey,
    notes,
    notesUpdatedAt,
    readyByUserId,
    readyCount,
    rosterCount,
    allReady: rosterCount > 0 && readyCount === rosterCount,
    checklist,
    checklistDoneCount,
    checklistTotalCount: checklist.length,
  };
}

export function isTournamentMatchPrepChecklistId(
  value: unknown,
): value is TournamentMatchPrepChecklistId {
  return (
    typeof value === "string" &&
    TOURNAMENT_MATCH_PREP_CHECKLIST.some((item) => item.id === value)
  );
}

function readChecklistId(payload: Record<string, unknown> | null) {
  const itemId = readString(payload, "item_id");
  return isTournamentMatchPrepChecklistId(itemId) ? itemId : null;
}

function readString(payload: Record<string, unknown> | null, key: string) {
  const value = payload?.[key];
  return typeof value === "string" ? value : null;
}

function readBoolean(payload: Record<string, unknown> | null, key: string) {
  const value = payload?.[key];
  return typeof value === "boolean" ? value : null;
}
