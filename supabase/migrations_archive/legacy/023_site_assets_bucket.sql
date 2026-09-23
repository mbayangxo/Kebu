-- Public site assets (logos, favicons, product photos) — uploaded from Kebu Builder

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-assets',
  'site-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Owners upload site assets" on storage.objects;
create policy "Owners upload site assets"
  on storage.objects for insert
  with check (
    bucket_id = 'site-assets'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owners update site assets" on storage.objects;
create policy "Owners update site assets"
  on storage.objects for update
  using (
    bucket_id = 'site-assets'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Public read site assets" on storage.objects;
create policy "Public read site assets"
  on storage.objects for select
  using (bucket_id = 'site-assets');

drop policy if exists "Owners delete site assets" on storage.objects;
create policy "Owners delete site assets"
  on storage.objects for delete
  using (
    bucket_id = 'site-assets'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );
