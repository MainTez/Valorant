insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'match-vods',
  'match-vods',
  false,
  53687091200,
  array['video/mp4', 'application/mp4']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

update storage.buckets
set file_size_limit = 53687091200
where id = 'match-vods';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vod-clips',
  'vod-clips',
  false,
  1073741824,
  array['video/mp4', 'video/webm']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

update storage.buckets
set file_size_limit = 1073741824
where id = 'vod-clips';
