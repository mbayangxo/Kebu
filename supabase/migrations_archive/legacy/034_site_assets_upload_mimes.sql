-- Expand site-assets MIME allowlist so phone JPEGs and common aliases upload reliably.
-- Safe to re-run. Does not change RLS.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-assets',
  'site-assets',
  true,
  52428800,
  array[
    'image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/x-png', 'image/webp', 'image/gif',
    'image/x-icon', 'image/vnd.microsoft.icon',
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/webm',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into public.builder_schema_meta (key, value)
values ('website_builder_version', '34')
on conflict (key) do update set value = excluded.value, updated_at = now();
