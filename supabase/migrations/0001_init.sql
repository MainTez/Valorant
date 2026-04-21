-- Nexus Team Hub — initial schema
-- All tables are team-scoped where applicable. RLS policies are in 0002_rls_policies.sql.

create extension if not exists "pgcrypto";

-- =========================
-- teams
-- =========================
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  accent_color text not null default 'gold',
  logo_url text,
  motto text,
  created_at timestamptz not null default now()
);

-- =========================
-- whitelist (gate for sign-in)
-- =========================
create table public.whitelist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  team_id uuid not null references public.teams(id) on delete cascade,
  role text not null check (role in ('player','coach','admin')) default 'player',
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index whitelist_email_idx on public.whitelist (lower(email));
create index whitelist_team_id_idx on public.whitelist (team_id);

-- =========================
-- users (mirrors auth.users, scoped to team)
-- =========================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  avatar_url text,
  team_id uuid not null references public.teams(id) on delete restrict,
  role text not null check (role in ('player','coach','admin')) default 'player',
  riot_name text,
  riot_tag text,
  riot_region text default 'eu',
  status text check (status in ('online','away','offline')) default 'offline',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_team_id_idx on public.users (team_id);
create index users_role_idx on public.users (role);

-- =========================
-- player_profiles (Henrik identity linkage + last snapshot)
-- =========================
create table public.player_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  riot_name text not null,
  riot_tag text not null,
  region text default 'eu',
  puuid text,
  current_rank text,
  current_rr int,
  peak_rank text,
  peak_rr int,
  headshot_pct numeric(5,2),
  kd_ratio numeric(6,3),
  acs numeric(7,2),
  win_rate numeric(5,2),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (riot_name, riot_tag)
);

create index player_profiles_team_id_idx on public.player_profiles (team_id);
create index player_profiles_user_id_idx on public.player_profiles (user_id);

-- =========================
-- tracked_stats (per-match time series from Henrik sync)
-- =========================
create table public.tracked_stats (
  id uuid primary key default gen_random_uuid(),
  player_profile_id uuid references public.player_profiles(id) on delete cascade,
  match_id text,
  played_at timestamptz,
  map text,
  agent text,
  mode text,
  result text check (result in ('win','loss','draw')),
  score_team int,
  score_opponent int,
  kills int,
  deaths int,
  assists int,
  acs int,
  adr int,
  headshot_pct numeric(5,2),
  rr_change int,
  rank_after text,
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (player_profile_id, match_id)
);

create index tracked_stats_pp_id_idx on public.tracked_stats (player_profile_id, played_at desc);
create index tracked_stats_played_at_idx on public.tracked_stats (played_at desc);

-- =========================
-- matches (manual scrim/official log)
-- =========================
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  opponent text not null,
  type text not null check (type in ('scrim','official','tournament')) default 'scrim',
  date timestamptz not null,
  map text not null,
  score_us int not null default 0,
  score_them int not null default 0,
  result text not null check (result in ('win','loss','draw')),
  notes text,
  vod_url text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index matches_team_date_idx on public.matches (team_id, date desc);

-- =========================
-- coach_notes (per-match)
-- =========================
create table public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  author_id uuid references public.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index coach_notes_match_idx on public.coach_notes (match_id, created_at desc);

-- =========================
-- routines + completion
-- =========================
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  items jsonb not null default '[]'::jsonb,
  scope text check (scope in ('daily','weekly','custom')) default 'daily',
  created_at timestamptz not null default now()
);

create index routines_team_idx on public.routines (team_id);

create table public.routine_progress (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  completed_items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (routine_id, user_id, date)
);

create index routine_progress_lookup_idx on public.routine_progress (user_id, date);

-- =========================
-- tasks
-- =========================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  description text,
  status text not null check (status in ('backlog','in_progress','done')) default 'backlog',
  priority text not null check (priority in ('low','med','high')) default 'med',
  assignee_id uuid references public.users(id) on delete set null,
  created_by uuid references public.users(id) on delete set null,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_team_status_idx on public.tasks (team_id, status);

-- =========================
-- chat
-- =========================
create table public.chat_channels (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (team_id, slug)
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.chat_channels(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index chat_messages_channel_idx on public.chat_messages (channel_id, created_at desc);

-- =========================
-- ai_predictions
-- =========================
create table public.ai_predictions (
  id uuid primary key default gen_random_uuid(),
  player_profile_id uuid not null references public.player_profiles(id) on delete cascade,
  predicted_rank text,
  predicted_rank_low text,
  predicted_rank_high text,
  confidence numeric(4,3),
  momentum numeric(5,3),
  consistency numeric(4,3),
  rr_trend numeric(8,3),
  win_rate numeric(5,2),
  strengths jsonb default '[]'::jsonb,
  weaknesses jsonb default '[]'::jsonb,
  best_agents jsonb default '[]'::jsonb,
  weak_maps jsonb default '[]'::jsonb,
  improvement_suggestions jsonb default '[]'::jsonb,
  reasoning text,
  engine_version text default 'v1',
  data_points jsonb default '{}'::jsonb,
  llm_used boolean default false,
  generated_at timestamptz not null default now()
);

create index ai_predictions_pp_idx on public.ai_predictions (player_profile_id, generated_at desc);

-- =========================
-- schedule_events
-- =========================
create table public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  kind text check (kind in ('practice','scrim','match','review','custom')) default 'custom',
  start_at timestamptz not null,
  end_at timestamptz,
  participants uuid[] default '{}',
  description text,
  location text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index schedule_events_team_start_idx on public.schedule_events (team_id, start_at);

-- =========================
-- team_notes (weekly focus / important / announcements)
-- =========================
create table public.team_notes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  kind text check (kind in ('weekly_focus','important','announcement')) default 'important',
  title text,
  body text not null,
  author_id uuid references public.users(id) on delete set null,
  pinned boolean default false,
  created_at timestamptz not null default now()
);

create index team_notes_team_idx on public.team_notes (team_id, created_at desc);

-- =========================
-- activity_events (feed)
-- =========================
create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  verb text not null,
  object_type text,
  object_id text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_events_team_idx on public.activity_events (team_id, created_at desc);

-- =========================
-- audit_logs
-- =========================
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- =========================
-- henrik_cache (API response cache)
-- =========================
create table public.henrik_cache (
  endpoint_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index henrik_cache_expires_idx on public.henrik_cache (expires_at);

-- =========================
-- updated_at triggers
-- =========================
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end
$$ language plpgsql;

create trigger users_touch before update on public.users
  for each row execute function public.touch_updated_at();

create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

create trigger routine_progress_touch before update on public.routine_progress
  for each row execute function public.touch_updated_at();
