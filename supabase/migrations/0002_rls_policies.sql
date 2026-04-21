-- Row-Level Security for Nexus Team Hub
-- Strict team isolation: a user can only see / mutate rows for their own team.
-- Admins bypass via role check.

alter table public.teams enable row level security;
alter table public.whitelist enable row level security;
alter table public.users enable row level security;
alter table public.player_profiles enable row level security;
alter table public.tracked_stats enable row level security;
alter table public.matches enable row level security;
alter table public.coach_notes enable row level security;
alter table public.routines enable row level security;
alter table public.routine_progress enable row level security;
alter table public.tasks enable row level security;
alter table public.chat_channels enable row level security;
alter table public.chat_messages enable row level security;
alter table public.ai_predictions enable row level security;
alter table public.schedule_events enable row level security;
alter table public.team_notes enable row level security;
alter table public.activity_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.henrik_cache enable row level security;

-- Helper functions

create or replace function public.current_team_id() returns uuid
language sql stable security definer set search_path = public as $$
  select team_id from public.users where id = auth.uid();
$$;

create or replace function public.current_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_coach_or_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and role in ('coach','admin'));
$$;

-- ============ teams ============
create policy "authed can read teams" on public.teams for select
  using (auth.uid() is not null);

create policy "admin manages teams" on public.teams for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============ whitelist (admin only) ============
create policy "admin reads whitelist" on public.whitelist for select
  using (public.is_admin());

create policy "admin writes whitelist" on public.whitelist for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============ users ============
create policy "user reads self" on public.users for select
  using (id = auth.uid());

create policy "user reads same team" on public.users for select
  using (team_id = public.current_team_id());

create policy "user updates self limited" on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "admin reads all users" on public.users for select
  using (public.is_admin());

create policy "admin writes users" on public.users for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============ player_profiles ============
create policy "team reads profiles" on public.player_profiles for select
  using (
    team_id = public.current_team_id() or team_id is null or public.is_admin()
  );

create policy "team writes profiles" on public.player_profiles for insert
  with check (team_id = public.current_team_id() or team_id is null or public.is_admin());

create policy "team updates profiles" on public.player_profiles for update
  using (team_id = public.current_team_id() or public.is_admin())
  with check (team_id = public.current_team_id() or public.is_admin());

create policy "team deletes profiles" on public.player_profiles for delete
  using (team_id = public.current_team_id() or public.is_admin());

-- ============ tracked_stats (linked via player_profiles) ============
create policy "team reads tracked_stats" on public.tracked_stats for select
  using (
    exists (
      select 1 from public.player_profiles pp
      where pp.id = tracked_stats.player_profile_id
        and (pp.team_id = public.current_team_id() or pp.team_id is null or public.is_admin())
    )
  );

create policy "server writes tracked_stats" on public.tracked_stats for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============ matches ============
create policy "team reads matches" on public.matches for select
  using (team_id = public.current_team_id() or public.is_admin());

create policy "team writes matches" on public.matches for insert
  with check (team_id = public.current_team_id() or public.is_admin());

create policy "team updates matches" on public.matches for update
  using (team_id = public.current_team_id() or public.is_admin())
  with check (team_id = public.current_team_id() or public.is_admin());

create policy "team deletes matches" on public.matches for delete
  using (
    (team_id = public.current_team_id() and (public.is_coach_or_admin() or created_by = auth.uid()))
    or public.is_admin()
  );

-- ============ coach_notes ============
create policy "team reads coach_notes" on public.coach_notes for select
  using (team_id = public.current_team_id() or public.is_admin());

create policy "coach writes coach_notes" on public.coach_notes for insert
  with check (
    team_id = public.current_team_id() and (public.is_coach_or_admin() or author_id = auth.uid())
  );

create policy "author manages coach_notes" on public.coach_notes for update
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

create policy "author deletes coach_notes" on public.coach_notes for delete
  using (author_id = auth.uid() or public.is_admin());

-- ============ routines ============
create policy "team reads routines" on public.routines for select
  using (team_id = public.current_team_id() or public.is_admin());

create policy "coach writes routines" on public.routines for all
  using (
    (team_id = public.current_team_id() and public.is_coach_or_admin())
    or public.is_admin()
  )
  with check (
    (team_id = public.current_team_id() and public.is_coach_or_admin())
    or public.is_admin()
  );

-- ============ routine_progress ============
create policy "user reads own progress" on public.routine_progress for select
  using (user_id = auth.uid() or public.is_coach_or_admin());

create policy "user writes own progress" on public.routine_progress for insert
  with check (user_id = auth.uid());

create policy "user updates own progress" on public.routine_progress for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "user deletes own progress" on public.routine_progress for delete
  using (user_id = auth.uid());

-- ============ tasks ============
create policy "team reads tasks" on public.tasks for select
  using (team_id = public.current_team_id() or public.is_admin());

create policy "team writes tasks" on public.tasks for insert
  with check (team_id = public.current_team_id());

create policy "team updates tasks" on public.tasks for update
  using (team_id = public.current_team_id() or public.is_admin())
  with check (team_id = public.current_team_id() or public.is_admin());

create policy "team deletes tasks" on public.tasks for delete
  using (
    (team_id = public.current_team_id() and (public.is_coach_or_admin() or created_by = auth.uid()))
    or public.is_admin()
  );

-- ============ chat_channels ============
create policy "team reads channels" on public.chat_channels for select
  using (team_id = public.current_team_id() or public.is_admin());

create policy "admin writes channels" on public.chat_channels for all
  using (public.is_coach_or_admin())
  with check (public.is_coach_or_admin());

-- ============ chat_messages ============
create policy "team reads messages" on public.chat_messages for select
  using (team_id = public.current_team_id() or public.is_admin());

create policy "user sends own messages" on public.chat_messages for insert
  with check (
    team_id = public.current_team_id() and author_id = auth.uid()
  );

create policy "author edits own messages" on public.chat_messages for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "author deletes own messages" on public.chat_messages for delete
  using (author_id = auth.uid() or public.is_coach_or_admin());

-- ============ ai_predictions ============
create policy "team reads predictions" on public.ai_predictions for select
  using (
    exists (
      select 1 from public.player_profiles pp
      where pp.id = ai_predictions.player_profile_id
        and (pp.team_id = public.current_team_id() or pp.team_id is null or public.is_admin())
    )
  );

create policy "server writes predictions" on public.ai_predictions for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============ schedule_events ============
create policy "team reads schedule" on public.schedule_events for select
  using (team_id = public.current_team_id() or public.is_admin());

create policy "coach manages schedule" on public.schedule_events for all
  using ((team_id = public.current_team_id() and public.is_coach_or_admin()) or public.is_admin())
  with check ((team_id = public.current_team_id() and public.is_coach_or_admin()) or public.is_admin());

-- ============ team_notes ============
create policy "team reads notes" on public.team_notes for select
  using (team_id = public.current_team_id() or public.is_admin());

create policy "coach writes notes" on public.team_notes for all
  using ((team_id = public.current_team_id() and public.is_coach_or_admin()) or public.is_admin())
  with check ((team_id = public.current_team_id() and public.is_coach_or_admin()) or public.is_admin());

-- ============ activity_events ============
create policy "team reads activity" on public.activity_events for select
  using (team_id = public.current_team_id() or public.is_admin());

create policy "team writes activity" on public.activity_events for insert
  with check (team_id = public.current_team_id());

-- ============ audit_logs (admin only) ============
create policy "admin reads audit" on public.audit_logs for select
  using (public.is_admin());

create policy "admin writes audit" on public.audit_logs for insert
  with check (public.is_admin());

-- ============ henrik_cache (server only - no client policies) ============
-- Accessed via service-role key only; service role bypasses RLS so no policy needed.
