-- Player availability for the active tournament.

create table public.tournament_opt_ins (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  tournament_key text not null,
  status text not null check (status in ('in','out')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, user_id, tournament_key)
);

create index tournament_opt_ins_team_key_idx
  on public.tournament_opt_ins (team_id, tournament_key, status);

create index tournament_opt_ins_user_idx
  on public.tournament_opt_ins (user_id, updated_at desc);

alter table public.tournament_opt_ins enable row level security;

create policy "team reads tournament opt ins" on public.tournament_opt_ins for select
  using (team_id = public.current_team_id() or public.is_admin());

create policy "user writes own tournament opt in" on public.tournament_opt_ins for insert
  with check (
    team_id = public.current_team_id()
    and user_id = auth.uid()
  );

create policy "user updates own tournament opt in" on public.tournament_opt_ins for update
  using (
    (team_id = public.current_team_id() and user_id = auth.uid())
    or public.is_admin()
  )
  with check (
    (team_id = public.current_team_id() and user_id = auth.uid())
    or public.is_admin()
  );

create policy "user deletes own tournament opt in" on public.tournament_opt_ins for delete
  using (
    (team_id = public.current_team_id() and user_id = auth.uid())
    or public.is_admin()
  );

create trigger tournament_opt_ins_touch before update on public.tournament_opt_ins
  for each row execute function public.touch_updated_at();
