-- Spotify now-playing OAuth token storage.
-- Tokens are scoped to the signed-in hub user and protected by RLS.

create table if not exists public.spotify_connections (
  user_id uuid primary key references public.users(id) on delete cascade,
  access_token text,
  refresh_token text not null,
  expires_at timestamptz,
  scope text,
  token_type text,
  spotify_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.spotify_connections enable row level security;

create policy "user reads own spotify connection"
  on public.spotify_connections for select
  using (user_id = auth.uid() or public.is_admin());

create policy "user creates own spotify connection"
  on public.spotify_connections for insert
  with check (user_id = auth.uid());

create policy "user updates own spotify connection"
  on public.spotify_connections for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "user deletes own spotify connection"
  on public.spotify_connections for delete
  using (user_id = auth.uid());
