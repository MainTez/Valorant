// Light/partial types for HenrikDev Valorant API responses.
// We only type the fields we consume — Henrik's schemas drift, normalize.ts defends us.

export interface HenrikAccountResponse {
  status?: number;
  data?: {
    puuid: string;
    region: string;
    account_level: number;
    name: string;
    tag: string;
    card?: { small?: string; large?: string; wide?: string; id?: string };
    last_update?: string;
    last_update_raw?: number;
  };
  errors?: Array<{ message: string; code?: number }>;
}

export interface HenrikMMRResponse {
  status?: number;
  data?: {
    current_data?: {
      currenttierpatched?: string;
      currenttier?: number;
      ranking_in_tier?: number;
      mmr_change_to_last_game?: number;
      elo?: number;
      games_needed_for_rating?: number;
      old?: boolean;
      leaderboard_rank?: number;
    };
    highest_rank?: {
      patched_tier?: string;
      tier?: number;
      season?: string;
    };
    by_season?: Record<string, unknown>;
  };
}

export interface HenrikMatchPlayer {
  puuid: string;
  name: string;
  tag: string;
  team: string;
  character?: string;
  currenttier_patched?: string;
  stats?: {
    score?: number;
    kills?: number;
    deaths?: number;
    assists?: number;
    bodyshots?: number;
    headshots?: number;
    legshots?: number;
  };
  damage_made?: number;
  damage_received?: number;
  rounds_played?: number;
}

export interface HenrikMatchResponse {
  status?: number;
  data?: Array<{
    metadata?: {
      matchid?: string;
      map?: string;
      game_length?: number;
      game_start?: number;
      game_start_patched?: string;
      queue?: string;
      mode?: string;
      rounds_played?: number;
    };
    players?: { all_players?: HenrikMatchPlayer[] };
    teams?: { red?: { has_won?: boolean; rounds_won?: number; rounds_lost?: number }; blue?: { has_won?: boolean; rounds_won?: number; rounds_lost?: number } };
  }>;
}

export interface HenrikMmrHistoryResponse {
  status?: number;
  data?: Array<{
    currenttier?: number;
    currenttier_patched?: string;
    date?: string;
    date_raw?: number;
    mmr_change_to_last_game?: number;
    elo?: number;
    map?: { name?: string };
  }>;
}
