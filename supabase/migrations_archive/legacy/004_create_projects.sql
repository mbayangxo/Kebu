-- Kebu Create Mode foundation: owned website projects with structured sections
-- Vertical slice: blank website → hero section → Postgres persistence + RLS

create extension if not exists "pgcrypto";

-- =====================
-- PROJECTS
-- =====================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  project_type text not null default 'website'
    check (project_type in ('website', 'store', 'portfolio', 'landing')),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_id_idx on public.projects (owner_id);
create index if not exists projects_owner_updated_idx on public.projects (owner_id, updated_at desc);

alter table public.projects enable row level security;

drop policy if exists "Owners select own projects" on public.projects;
create policy "Owners select own projects"
  on public.projects for select
  using (auth.uid() = owner_id);

drop policy if exists "Owners insert own projects" on public.projects;
create policy "Owners insert own projects"
  on public.projects for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Owners update own projects" on public.projects;
create policy "Owners update own projects"
  on public.projects for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Owners delete own projects" on public.projects;
create policy "Owners delete own projects"
  on public.projects for delete
  using (auth.uid() = owner_id);

-- =====================
-- PROJECT PAGES
-- =====================
create table if not exists public.project_pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  slug text not null default 'home' check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null default 'Home' check (char_length(trim(title)) between 1 and 120),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, slug)
);

create index if not exists project_pages_project_id_idx on public.project_pages (project_id);

alter table public.project_pages enable row level security;

drop policy if exists "Owners select own project pages" on public.project_pages;
create policy "Owners select own project pages"
  on public.project_pages for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_pages.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners insert own project pages" on public.project_pages;
create policy "Owners insert own project pages"
  on public.project_pages for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_pages.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners update own project pages" on public.project_pages;
create policy "Owners update own project pages"
  on public.project_pages for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_pages.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_pages.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners delete own project pages" on public.project_pages;
create policy "Owners delete own project pages"
  on public.project_pages for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_pages.project_id and p.owner_id = auth.uid()
    )
  );

-- =====================
-- PROJECT SECTIONS (structured blocks)
-- =====================
create table if not exists public.project_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.project_pages(id) on delete cascade,
  section_type text not null default 'hero'
    check (section_type in (
      'hero', 'heading', 'paragraph', 'image', 'button',
      'features', 'footer', 'navigation', 'whatsapp'
    )),
  sort_order integer not null default 0,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_sections_page_id_idx on public.project_sections (page_id);
create index if not exists project_sections_page_sort_idx on public.project_sections (page_id, sort_order);

alter table public.project_sections enable row level security;

drop policy if exists "Owners select own project sections" on public.project_sections;
create policy "Owners select own project sections"
  on public.project_sections for select
  using (
    exists (
      select 1
      from public.project_pages pg
      join public.projects p on p.id = pg.project_id
      where pg.id = project_sections.page_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners insert own project sections" on public.project_sections;
create policy "Owners insert own project sections"
  on public.project_sections for insert
  with check (
    exists (
      select 1
      from public.project_pages pg
      join public.projects p on p.id = pg.project_id
      where pg.id = project_sections.page_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners update own project sections" on public.project_sections;
create policy "Owners update own project sections"
  on public.project_sections for update
  using (
    exists (
      select 1
      from public.project_pages pg
      join public.projects p on p.id = pg.project_id
      where pg.id = project_sections.page_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.project_pages pg
      join public.projects p on p.id = pg.project_id
      where pg.id = project_sections.page_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners delete own project sections" on public.project_sections;
create policy "Owners delete own project sections"
  on public.project_sections for delete
  using (
    exists (
      select 1
      from public.project_pages pg
      join public.projects p on p.id = pg.project_id
      where pg.id = project_sections.page_id and p.owner_id = auth.uid()
    )
  );

-- updated_at triggers (reuse function from 001 if present)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists project_pages_set_updated_at on public.project_pages;
create trigger project_pages_set_updated_at
  before update on public.project_pages
  for each row execute function public.set_updated_at();

drop trigger if exists project_sections_set_updated_at on public.project_sections;
create trigger project_sections_set_updated_at
  before update on public.project_sections
  for each row execute function public.set_updated_at();
