-- Desktop app match moments and team sync state.

create table public.match_moments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  player_profile_id uuid not null references public.player_profiles(id) on delete cascade,
  match_id text not null,
  label text not null,
  title text not null,
  subtitle text not null,
  severity text not null check (severity in ('hype','flame','warning','normal')) default 'normal',
  sound text not null check (sound in ('carry','inted','normal')) default 'normal',
  performance_index int not null check (performance_index >= 0 and performance_index <= 100),
  stats jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  played_at timestamptz,
  created_at timestamptz not null default now(),
  unique (player_profile_id, match_id)
);

create index match_moments_team_created_idx on public.match_moments (team_id, created_at desc);
create index match_moments_team_played_idx on public.match_moments (team_id, played_at desc);

create table public.desktop_sync_state (
  team_id uuid primary key references public.teams(id) on delete cascade,
  last_polled_at timestamptz,
  backoff_until timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

alter table public.match_moments enable row level security;
alter table public.desktop_sync_state enable row level security;

create policy "team reads match moments" on public.match_moments for select
  using (team_id = public.current_team_id() or public.is_admin());

create policy "server writes match moments" on public.match_moments for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin reads desktop sync state" on public.desktop_sync_state for select
  using (public.is_admin());

create policy "admin writes desktop sync state" on public.desktop_sync_state for all
  using (public.is_admin())
  with check (public.is_admin());

create trigger desktop_sync_state_touch before update on public.desktop_sync_state
  for each row execute function public.touch_updated_at();
