-- VOD clips and chat edit metadata.

alter table public.chat_messages
  add column if not exists updated_at timestamptz;

create table if not exists public.vod_clips (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  title text not null,
  description text,
  source_type text not null check (source_type in ('upload', 'external')),
  storage_path text,
  external_url text,
  original_name text,
  content_type text,
  size_bytes bigint,
  start_seconds int,
  end_seconds int,
  map text,
  opponent text,
  tags text[] not null default '{}',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (source_type = 'upload' and storage_path is not null and external_url is null)
    or
    (source_type = 'external' and external_url is not null and storage_path is null)
  ),
  check (start_seconds is null or start_seconds >= 0),
  check (end_seconds is null or end_seconds >= 0),
  check (end_seconds is null or start_seconds is null or end_seconds > start_seconds)
);

create index if not exists vod_clips_team_created_idx
  on public.vod_clips (team_id, created_at desc);

create index if not exists vod_clips_match_idx
  on public.vod_clips (match_id, created_at desc);

alter table public.vod_clips enable row level security;

drop policy if exists "team reads vod_clips" on public.vod_clips;
create policy "team reads vod_clips" on public.vod_clips for select
  using (team_id = public.current_team_id() or public.is_admin());

drop policy if exists "team creates vod_clips" on public.vod_clips;
create policy "team creates vod_clips" on public.vod_clips for insert
  with check (team_id = public.current_team_id() and created_by = auth.uid());

drop policy if exists "creator updates vod_clips" on public.vod_clips;
create policy "creator updates vod_clips" on public.vod_clips for update
  using (
    team_id = public.current_team_id()
    and (created_by = auth.uid() or public.is_coach_or_admin())
  )
  with check (
    team_id = public.current_team_id()
    and (created_by = auth.uid() or public.is_coach_or_admin())
  );

drop policy if exists "creator deletes vod_clips" on public.vod_clips;
create policy "creator deletes vod_clips" on public.vod_clips for delete
  using (
    team_id = public.current_team_id()
    and (created_by = auth.uid() or public.is_coach_or_admin())
  );
