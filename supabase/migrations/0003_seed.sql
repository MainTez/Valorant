-- Seed: two teams + default channels + default routines + admin whitelist entry

-- Teams
insert into public.teams (id, slug, name, accent_color, motto) values
  ('00000000-0000-0000-0000-000000000001', 'surf-n-bulls', 'Surf''n Bulls', 'gold',    'One team. One mind. One goal.'),
  ('00000000-0000-0000-0000-000000000002', 'molgarians',   'Molgarians',    'red',     'Analytical minds. Tactical planners.')
on conflict (slug) do nothing;

-- Default channels per team
insert into public.chat_channels (team_id, slug, name, description)
select t.id, c.slug, c.name, c.description
from public.teams t
cross join (values
  ('general',      'general',      'Team-wide chat'),
  ('match-day',    'match-day',    'Match-day comms and focus'),
  ('strats',       'strats',       'Strategy and utility discussion'),
  ('routines',     'routines',     'Practice routine coordination'),
  ('review',       'review',       'VOD review and feedback'),
  ('announcements','announcements','Coach and admin announcements')
) as c(slug, name, description)
on conflict (team_id, slug) do nothing;

-- Default routines per team
insert into public.routines (team_id, title, items, scope)
select t.id, 'Daily practice', jsonb_build_array(
  jsonb_build_object('id','aim_training', 'label','Aim Training'),
  jsonb_build_object('id','deathmatch',   'label','Deathmatch'),
  jsonb_build_object('id','vod_review',   'label','VOD Review'),
  jsonb_build_object('id','strat_practice','label','Strat Practice'),
  jsonb_build_object('id','team_comms',   'label','Team Comms')
), 'daily'
from public.teams t;

-- Weekly focus seed
insert into public.team_notes (team_id, kind, title, body, pinned)
select t.id, 'weekly_focus', 'Mid Control',
  'Take and control mid on every map. Keep using utility early and trust the plan.',
  true
from public.teams t;

-- Admin whitelist entry (for the initial user). Adjust email to match the team owner.
insert into public.whitelist (email, team_id, role)
values
  ('vegard.laland@gmail.com', '00000000-0000-0000-0000-000000000001', 'admin')
on conflict (email) do nothing;
