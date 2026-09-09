-- S17: Studio folders / collections for design library
-- Depends on: create_designs (022), set_updated_at()

create table if not exists public.studio_folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

create index if not exists studio_folders_owner_idx
  on public.studio_folders (owner_id, updated_at desc);

alter table public.studio_folders enable row level security;

drop policy if exists "Owners manage studio folders" on public.studio_folders;
create policy "Owners manage studio folders"
  on public.studio_folders for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

grant select, insert, update, delete on public.studio_folders to authenticated;
grant all on public.studio_folders to service_role;

drop trigger if exists studio_folders_set_updated_at on public.studio_folders;
create trigger studio_folders_set_updated_at
  before update on public.studio_folders
  for each row execute function public.set_updated_at();

alter table public.create_designs
  add column if not exists folder_id uuid references public.studio_folders(id) on delete set null;

create index if not exists create_designs_folder_idx
  on public.create_designs (owner_id, folder_id, updated_at desc)
  where folder_id is not null;

notify pgrst, 'reload schema';
