export type Role = "player" | "coach" | "admin";
export type Result = "win" | "loss" | "draw";
export type MatchType = "scrim" | "official" | "tournament";

export interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  team_id: string;
  role: Role;
  riot_name: string | null;
  riot_tag: string | null;
  riot_region: string | null;
  status: "online" | "away" | "offline" | null;
  created_at: string;
  updated_at: string;
}

export interface TeamRow {
  id: string;
  slug: string;
  name: string;
  accent_color: string;
  logo_url: string | null;
  motto: string | null;
  created_at: string;
}

export interface PlayerProfileRow {
  id: string;
  user_id: string | null;
  team_id: string | null;
  riot_name: string;
  riot_tag: string;
  region: string | null;
  puuid: string | null;
  current_rank: string | null;
  current_rr: number | null;
  peak_rank: string | null;
  peak_rr: number | null;
  headshot_pct: number | null;
  kd_ratio: number | null;
  acs: number | null;
  win_rate: number | null;
  last_synced_at: string | null;
  created_at: string;
}

export interface TrackedStatRow {
  id: string;
  player_profile_id: string | null;
  match_id: string | null;
  played_at: string | null;
  map: string | null;
  agent: string | null;
  mode: string | null;
  result: Result | null;
  score_team: number | null;
  score_opponent: number | null;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  acs: number | null;
  adr: number | null;
  headshot_pct: number | null;
  rr_change: number | null;
  rank_after: string | null;
  raw: unknown;
}

export interface MatchRow {
  id: string;
  team_id: string;
  opponent: string;
  type: MatchType;
  date: string;
  map: string;
  score_us: number;
  score_them: number;
  result: Result;
  notes: string | null;
  vod_url: string | null;
  vod_content_type: string | null;
  vod_original_name: string | null;
  vod_size_bytes: number | null;
  vod_storage_path: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CoachNoteRow {
  id: string;
  match_id: string | null;
  team_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
}

export interface RoutineItem {
  id: string;
  label: string;
  detail?: string;
  duration?: string;
  tag?: string;
}

export interface RoutineRow {
  id: string;
  team_id: string;
  title: string;
  items: RoutineItem[];
  scope: "daily" | "weekly" | "custom";
  created_at: string;
}

export interface RoutineProgressRow {
  id: string;
  routine_id: string;
  user_id: string;
  date: string;
  completed_items: string[];
  updated_at: string;
}

export interface SpotifyConnectionRow {
  user_id: string;
  access_token: string | null;
  refresh_token: string;
  expires_at: string | null;
  scope: string | null;
  token_type: string | null;
  spotify_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskRow {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  status: "backlog" | "in_progress" | "done";
  priority: "low" | "med" | "high";
  assignee_id: string | null;
  created_by: string | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatChannelRow {
  id: string;
  team_id: string;
  slug: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ChatMessageRow {
  id: string;
  channel_id: string;
  team_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface ScheduleEventRow {
  id: string;
  team_id: string;
  title: string;
  kind: "practice" | "scrim" | "match" | "review" | "custom";
  start_at: string;
  end_at: string | null;
  participants: string[];
  description: string | null;
  location: string | null;
  created_by: string | null;
  created_at: string;
}

export interface TeamNoteRow {
  id: string;
  team_id: string;
  kind: "weekly_focus" | "important" | "announcement";
  title: string | null;
  body: string;
  author_id: string | null;
  pinned: boolean;
  created_at: string;
}

export interface ActivityEventRow {
  id: string;
  team_id: string;
  actor_id: string | null;
  verb: string;
  object_type: string | null;
  object_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface AiPredictionRow {
  id: string;
  player_profile_id: string;
  predicted_rank: string | null;
  predicted_rank_low: string | null;
  predicted_rank_high: string | null;
  confidence: number | null;
  momentum: number | null;
  consistency: number | null;
  rr_trend: number | null;
  win_rate: number | null;
  strengths: string[];
  weaknesses: string[];
  best_agents: Array<{ agent: string; games: number; acs: number; winRate: number }>;
  weak_maps: Array<{ map: string; games: number; winRate: number }>;
  improvement_suggestions: string[];
  reasoning: string | null;
  engine_version: string;
  data_points: Record<string, unknown>;
  llm_used: boolean;
  generated_at: string;
}

export interface WhitelistRow {
  id: string;
  email: string;
  team_id: string;
  role: Role;
  added_by: string | null;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// UI-facing Henrik-normalized shapes

export interface NormalizedAccount {
  puuid: string;
  name: string;
  tag: string;
  region: string;
  accountLevel: number | null;
  cardUrl: string | null;
  updatedAt: string;
}

export interface NormalizedMMR {
  currentTier: string | null;
  currentTierId: number | null;
  currentRR: number | null;
  peakTier: string | null;
  peakRR: number | null;
  leaderboardPlace: number | null;
}

export interface NormalizedMatch {
  matchId: string;
  startedAt: string;
  map: string;
  mode: string;
  agent: string | null;
  result: Result | null;
  scoreTeam: number;
  scoreOpponent: number;
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  adr: number;
  headshotPct: number;
  rrChange: number | null;
  rankAfter: string | null;
  raw?: unknown;
}

export interface NormalizedMmrHistoryEntry {
  date: string;
  currentTier: string | null;
  tierId: number | null;
  rrChange: number;
  elo: number | null;
  map: string | null;
}
