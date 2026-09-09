-- =============================================================================
-- APPLY_077_THROUGH_079.sql
-- Paste once: Studio folders · version history · comments
-- After APPLY_055_THROUGH_076.sql (or equivalent)
-- =============================================================================


-- >>> BEGIN 077_studio_folders.sql

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

-- <<< END 077_studio_folders.sql


-- >>> BEGIN 078_studio_design_versions.sql

-- S18: Studio design version history (restore prior canvas)
-- Depends on: create_designs (022), studio_design_collaborators (071) optional

create table if not exists public.studio_design_versions (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.create_designs(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  canvas jsonb not null,
  label text check (label is null or char_length(trim(label)) between 1 and 120),
  source text not null default 'auto'
    check (source in ('auto', 'manual', 'pre_restore')),
  created_at timestamptz not null default now()
);

create index if not exists studio_design_versions_design_idx
  on public.studio_design_versions (design_id, created_at desc);

alter table public.studio_design_versions enable row level security;

drop policy if exists "Design members read versions" on public.studio_design_versions;
create policy "Design members read versions"
  on public.studio_design_versions for select
  using (
    exists (
      select 1 from public.create_designs d
      where d.id = studio_design_versions.design_id
        and (
          d.owner_id = auth.uid()
          or exists (
            select 1 from public.studio_design_collaborators c
            where c.design_id = d.id
              and c.user_id = auth.uid()
              and c.status = 'active'
          )
        )
    )
  );

drop policy if exists "Editors insert versions" on public.studio_design_versions;
create policy "Editors insert versions"
  on public.studio_design_versions for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.create_designs d
      where d.id = studio_design_versions.design_id
        and (
          d.owner_id = auth.uid()
          or exists (
            select 1 from public.studio_design_collaborators c
            where c.design_id = d.id
              and c.user_id = auth.uid()
              and c.status = 'active'
              and c.role = 'editor'
          )
        )
    )
  );

drop policy if exists "Editors prune versions" on public.studio_design_versions;
create policy "Editors prune versions"
  on public.studio_design_versions for delete
  using (
    exists (
      select 1 from public.create_designs d
      where d.id = studio_design_versions.design_id
        and (
          d.owner_id = auth.uid()
          or exists (
            select 1 from public.studio_design_collaborators c
            where c.design_id = d.id
              and c.user_id = auth.uid()
              and c.status = 'active'
              and c.role = 'editor'
          )
        )
    )
  );

-- No client updates — prune + cascade delete only.
grant select, insert, delete on public.studio_design_versions to authenticated;
grant all on public.studio_design_versions to service_role;

notify pgrst, 'reload schema';

-- <<< END 078_studio_design_versions.sql


-- >>> BEGIN 079_studio_design_comments.sql

-- S20: Async comments on Studio designs (not live cursors)
-- Depends on: create_designs (022), studio_design_collaborators (071)

create table if not exists public.studio_design_comments (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.create_designs(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  /** Optional pin on canvas (normalized 0–1) */
  anchor_x numeric(6,4) check (anchor_x is null or (anchor_x >= 0 and anchor_x <= 1)),
  anchor_y numeric(6,4) check (anchor_y is null or (anchor_y >= 0 and anchor_y <= 1)),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_design_comments_design_idx
  on public.studio_design_comments (design_id, created_at desc);

alter table public.studio_design_comments enable row level security;

drop policy if exists "Design members read comments" on public.studio_design_comments;
create policy "Design members read comments"
  on public.studio_design_comments for select
  using (
    exists (
      select 1 from public.create_designs d
      where d.id = studio_design_comments.design_id
        and (
          d.owner_id = auth.uid()
          or exists (
            select 1 from public.studio_design_collaborators c
            where c.design_id = d.id and c.user_id = auth.uid() and c.status = 'active'
          )
        )
    )
  );

drop policy if exists "Design members insert comments" on public.studio_design_comments;
create policy "Design members insert comments"
  on public.studio_design_comments for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.create_designs d
      where d.id = studio_design_comments.design_id
        and (
          d.owner_id = auth.uid()
          or exists (
            select 1 from public.studio_design_collaborators c
            where c.design_id = d.id and c.user_id = auth.uid() and c.status = 'active'
          )
        )
    )
  );

drop policy if exists "Authors and owners update comments" on public.studio_design_comments;
create policy "Authors and owners update comments"
  on public.studio_design_comments for update
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.create_designs d
      where d.id = studio_design_comments.design_id and d.owner_id = auth.uid()
    )
  )
  with check (
    author_id = auth.uid()
    or exists (
      select 1 from public.create_designs d
      where d.id = studio_design_comments.design_id and d.owner_id = auth.uid()
    )
  );

drop policy if exists "Authors and owners delete comments" on public.studio_design_comments;
create policy "Authors and owners delete comments"
  on public.studio_design_comments for delete
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.create_designs d
      where d.id = studio_design_comments.design_id and d.owner_id = auth.uid()
    )
  );

drop trigger if exists studio_design_comments_set_updated_at on public.studio_design_comments;
create trigger studio_design_comments_set_updated_at
  before update on public.studio_design_comments
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.studio_design_comments to authenticated;
grant all on public.studio_design_comments to service_role;

notify pgrst, 'reload schema';

-- <<< END 079_studio_design_comments.sql


notify pgrst, 'reload schema';
