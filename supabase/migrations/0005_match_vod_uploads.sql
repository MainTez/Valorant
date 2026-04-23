-- Match-scoped VOD metadata for private Supabase Storage uploads
alter table public.matches
  add column if not exists vod_storage_path text,
  add column if not exists vod_original_name text,
  add column if not exists vod_content_type text,
  add column if not exists vod_size_bytes bigint;
