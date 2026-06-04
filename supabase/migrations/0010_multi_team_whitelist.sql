alter table public.whitelist
  drop constraint if exists whitelist_email_key;

do $$
begin
  if not exists (
      select 1
      from pg_constraint
      where conname = 'whitelist_email_team_key'
        and conrelid = 'public.whitelist'::regclass
  ) then
    alter table public.whitelist
      add constraint whitelist_email_team_key unique (email, team_id);
  end if;
end $$;

insert into public.whitelist (email, team_id, role)
values ('danilebnen@gmail.com', '00000000-0000-0000-0000-000000000001', 'admin')
on conflict (email, team_id) do update
set role = excluded.role;
