create table if not exists public.room_files (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  file_name text not null check (char_length(trim(file_name)) between 1 and 240),
  storage_path text not null unique check (char_length(storage_path) between 8 and 1000),
  mime text not null default 'application/octet-stream',
  byte_size bigint not null check (byte_size between 1 and 52428800),
  created_at timestamptz not null default now()
);

create index if not exists room_files_room_time_idx on public.room_files(room_id, created_at desc);

alter table public.room_files enable row level security;

drop policy if exists "Members read room files" on public.room_files;
create policy "Members read room files" on public.room_files for select
using (public.can_access_room(room_id));

drop policy if exists "Members create room files" on public.room_files;
create policy "Members create room files" on public.room_files for insert
with check (uploaded_by = auth.uid() and public.can_access_room(room_id));

drop policy if exists "Uploaders delete room files" on public.room_files;
create policy "Uploaders delete room files" on public.room_files for delete
using (
  uploaded_by = auth.uid()
  or exists (
    select 1 from public.room_members rm
    where rm.room_id = room_files.room_id
      and rm.user_id = auth.uid()
      and rm.role in ('owner','admin')
  )
);
