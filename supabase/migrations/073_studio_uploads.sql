-- Studio uploads library (reusable media across designs)
-- Depends on: auth.users · site-assets storage (023)

create table if not exists public.studio_uploads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  url text not null check (char_length(trim(url)) between 8 and 500),
  storage_path text,
  file_name text check (file_name is null or char_length(file_name) <= 200),
  mime text check (mime is null or char_length(mime) <= 100),
  byte_size int check (byte_size is null or byte_size >= 0),
  created_at timestamptz not null default now()
);

create index if not exists studio_uploads_owner_idx
  on public.studio_uploads (owner_id, created_at desc);

alter table public.studio_uploads enable row level security;

drop policy if exists "Owners manage studio uploads" on public.studio_uploads;
create policy "Owners manage studio uploads"
  on public.studio_uploads for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

grant select, insert, update, delete on public.studio_uploads to authenticated;
grant all on public.studio_uploads to service_role;

notify pgrst, 'reload schema';
