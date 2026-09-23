-- Shopify-style named templates (themes) per project.
-- One live template per site; others are drafts. Publishing a draft makes the previous live a draft.
-- Uploads are structured website-v1 JSON only (not HTML/WordPress/ThemeForest zips).

create table if not exists public.project_themes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  status text not null default 'draft'
    check (status in ('live', 'draft')),
  source text not null default 'current'
    check (source in ('current', 'catalog', 'upload')),
  catalog_slug text,
  definition jsonb not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_themes_project_idx
  on public.project_themes (project_id, updated_at desc);

create unique index if not exists project_themes_one_live_idx
  on public.project_themes (project_id)
  where status = 'live';

alter table public.projects
  add column if not exists active_theme_id uuid references public.project_themes(id) on delete set null;

alter table public.project_themes enable row level security;

drop policy if exists "Owners select project themes" on public.project_themes;
create policy "Owners select project themes"
  on public.project_themes for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_themes.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners insert project themes" on public.project_themes;
create policy "Owners insert project themes"
  on public.project_themes for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_themes.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners update project themes" on public.project_themes;
create policy "Owners update project themes"
  on public.project_themes for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_themes.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_themes.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners delete project themes" on public.project_themes;
create policy "Owners delete project themes"
  on public.project_themes for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_themes.project_id and p.owner_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.project_themes to authenticated;
