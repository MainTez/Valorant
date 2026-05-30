alter table public.users
  add column if not exists preferred_valorant_role text;

alter table public.users
  add column if not exists secondary_valorant_roles text[] not null default '{}'::text[];

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_preferred_valorant_role_check'
  ) then
    alter table public.users
      add constraint users_preferred_valorant_role_check
      check (
        preferred_valorant_role is null
        or preferred_valorant_role in ('Duelist', 'Sentinel', 'Initiator', 'Controller')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_secondary_valorant_roles_check'
  ) then
    alter table public.users
      add constraint users_secondary_valorant_roles_check
      check (
        secondary_valorant_roles <@ array['Duelist', 'Sentinel', 'Initiator', 'Controller']::text[]
        and (
          preferred_valorant_role is null
          or not preferred_valorant_role = any(secondary_valorant_roles)
        )
      );
  end if;
end $$;
