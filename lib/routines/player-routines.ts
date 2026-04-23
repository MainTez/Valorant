import type { RoutineItem, RoutineRow, UserRow } from "@/types/domain";

type RoutineUser = Pick<UserRow, "email" | "display_name">;

type PlayerRoutineKey = "maintez" | "ashmumu" | "johanjojo" | "kittypolo" | "hopped";

interface PlayerRoutineConfig {
  playerName: string;
  title: string;
  items: RoutineItem[];
}

const PLAYER_ROUTINES: Record<PlayerRoutineKey, PlayerRoutineConfig> = {
  maintez: {
    playerName: "MainTez",
    title: "MainTez daily command block",
    items: [
      {
        id: "maintez_rank_pulse",
        label: "Rank pulse and tracker review",
        detail: "Check yesterday's RR movement, weak map, and one stat to fix before queue.",
        duration: "8 min",
        tag: "prep",
      },
      {
        id: "maintez_aim_control",
        label: "Precision aim warmup",
        detail: "Two range sets, then one clean deathmatch focused on first-bullet accuracy.",
        duration: "18 min",
        tag: "mechanics",
      },
      {
        id: "maintez_comp_block",
        label: "Focused competitive block",
        detail: "Play two games with one clear IGL goal: early plan, mid-round reset, post-round call.",
        duration: "2 games",
        tag: "ranked",
      },
      {
        id: "maintez_vod_clip",
        label: "Clip one mistake and one good call",
        detail: "Save timestamps and write the correction in team chat or notes.",
        duration: "12 min",
        tag: "review",
      },
      {
        id: "maintez_team_update",
        label: "Team update",
        detail: "Post today's focus and what needs reps from the squad.",
        duration: "5 min",
        tag: "team",
      },
    ],
  },
  ashmumu: {
    playerName: "Ashmumu",
    title: "Ashmumu daily consistency block",
    items: [
      {
        id: "ashmumu_crosshair",
        label: "Crosshair placement route",
        detail: "Walk two maps in custom and clear common angles at head level only.",
        duration: "12 min",
        tag: "mechanics",
      },
      {
        id: "ashmumu_utility",
        label: "Utility reps",
        detail: "Run five executes or retakes for your main agent until the timing feels automatic.",
        duration: "15 min",
        tag: "agent",
      },
      {
        id: "ashmumu_comms",
        label: "Comms-focused ranked games",
        detail: "Queue with a goal to call damage, utility used, and enemy position before every swing.",
        duration: "2 games",
        tag: "ranked",
      },
      {
        id: "ashmumu_reset",
        label: "Mental reset check",
        detail: "After each game, write one thing to repeat and one thing to stop doing.",
        duration: "6 min",
        tag: "review",
      },
      {
        id: "ashmumu_vod_note",
        label: "One round VOD note",
        detail: "Review one lost round and identify whether the issue was timing, spacing, or utility.",
        duration: "10 min",
        tag: "review",
      },
    ],
  },
  johanjojo: {
    playerName: "Johan jojo",
    title: "Johan jojo daily impact block",
    items: [
      {
        id: "johanjojo_micro_aim",
        label: "Micro-adjustment warmup",
        detail: "Range bots and one deathmatch with no crouch spraying for the first half.",
        duration: "18 min",
        tag: "mechanics",
      },
      {
        id: "johanjojo_agent_plan",
        label: "Agent plan refresh",
        detail: "Pick today's agent and rehearse two attack plans plus two defensive reactions.",
        duration: "12 min",
        tag: "agent",
      },
      {
        id: "johanjojo_trade_focus",
        label: "Trade spacing games",
        detail: "In ranked, keep every first contact tradable and call before taking space.",
        duration: "2 games",
        tag: "ranked",
      },
      {
        id: "johanjojo_clutch_review",
        label: "Clutch review",
        detail: "Save one late-round situation and write what information changed the decision.",
        duration: "10 min",
        tag: "review",
      },
      {
        id: "johanjojo_team_sync",
        label: "Team sync note",
        detail: "Share one useful setup, lineup, or timing that helped today.",
        duration: "5 min",
        tag: "team",
      },
    ],
  },
  kittypolo: {
    playerName: "Kittypolo",
    title: "Kittypolo daily sharpness block",
    items: [
      {
        id: "kittypolo_flick_control",
        label: "Flick control primer",
        detail: "Short range set, medium range set, then one sheriff-only warmup segment.",
        duration: "15 min",
        tag: "mechanics",
      },
      {
        id: "kittypolo_map_pathing",
        label: "Map pathing reps",
        detail: "Run the first 25 seconds of your default route on two maps and clean every angle.",
        duration: "12 min",
        tag: "maps",
      },
      {
        id: "kittypolo_ranked_objective",
        label: "Objective-based ranked",
        detail: "Play with one measurable focus: deaths before trade, utility value, or entry timing.",
        duration: "2 games",
        tag: "ranked",
      },
      {
        id: "kittypolo_post_game",
        label: "Post-game stat check",
        detail: "Check K/D, ADR, and one lost duel pattern without overreacting to the score.",
        duration: "8 min",
        tag: "review",
      },
      {
        id: "kittypolo_cooldown",
        label: "Cooldown notes",
        detail: "Write the next session's first drill before logging off.",
        duration: "4 min",
        tag: "discipline",
      },
    ],
  },
  hopped: {
    playerName: "Hopped",
    title: "Hopped daily entry block",
    items: [
      {
        id: "hopped_movement",
        label: "Movement and peeking reps",
        detail: "Practice wide swing, jiggle, and deadzone shots on two common entry lanes.",
        duration: "15 min",
        tag: "mechanics",
      },
      {
        id: "hopped_entry_routes",
        label: "Entry route planning",
        detail: "Pick two maps and define the first contact route, smoke gap, and fallback path.",
        duration: "10 min",
        tag: "maps",
      },
      {
        id: "hopped_trade_timing",
        label: "Trade timing games",
        detail: "Queue with a focus on either creating first contact or instantly trading it.",
        duration: "2 games",
        tag: "ranked",
      },
      {
        id: "hopped_death_review",
        label: "First-death review",
        detail: "Review every early death and mark whether it was spacing, timing, or information.",
        duration: "10 min",
        tag: "review",
      },
      {
        id: "hopped_reset",
        label: "Reset and stretch",
        detail: "Short break, wrist reset, and one sentence on what to repeat tomorrow.",
        duration: "5 min",
        tag: "recovery",
      },
    ],
  },
};

const ALIASES: Record<string, PlayerRoutineKey> = {
  maintez: "maintez",
  "main tez": "maintez",
  ashmumu: "ashmumu",
  ash: "ashmumu",
  johan: "johanjojo",
  jojo: "johanjojo",
  johanjojo: "johanjojo",
  "johan jojo": "johanjojo",
  kittypolo: "kittypolo",
  kitty: "kittypolo",
  hopped: "hopped",
};

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function spaced(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchRoutineKey(user: RoutineUser): PlayerRoutineKey | null {
  const email = user.email.toLowerCase();
  const localPart = email.split("@")[0] ?? email;
  const candidates = [
    email,
    localPart,
    compact(localPart),
    spaced(localPart),
    user.display_name ?? "",
    compact(user.display_name ?? ""),
    spaced(user.display_name ?? ""),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const direct = ALIASES[candidate.toLowerCase()];
    if (direct) return direct;
  }

  return null;
}

export function getPersonalRoutineName(user: RoutineUser) {
  const key = matchRoutineKey(user);
  return key ? PLAYER_ROUTINES[key].playerName : null;
}

export function personalizeRoutineForUser(
  routine: RoutineRow | null,
  user: RoutineUser,
): RoutineRow | null {
  if (!routine || routine.scope !== "daily") return routine;

  const key = matchRoutineKey(user);
  if (!key) return routine;

  const config = PLAYER_ROUTINES[key];
  return {
    ...routine,
    title: config.title,
    items: config.items,
  };
}
