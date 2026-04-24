-- Player-specific routines managed by admins.

alter table public.routines
  add column if not exists assigned_user_id uuid references public.users(id) on delete cascade;

create index if not exists routines_assigned_user_idx
  on public.routines (assigned_user_id, scope);

create unique index if not exists routines_daily_assigned_user_unique_idx
  on public.routines (team_id, assigned_user_id, scope)
  where assigned_user_id is not null and scope = 'daily';

drop policy if exists "team reads routines" on public.routines;

create policy "team reads routines" on public.routines for select
  using (
    public.is_admin()
    or (
      team_id = public.current_team_id()
      and (
        assigned_user_id is null
        or assigned_user_id = auth.uid()
        or public.is_coach_or_admin()
      )
    )
  );
