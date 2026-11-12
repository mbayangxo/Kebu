create table if not exists public.opportunity_research_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  question text not null default '' check (char_length(question) <= 2000),
  notes text not null default '' check (char_length(notes) <= 30000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opportunity_research_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.opportunity_research_projects(id) on delete cascade,
  added_by uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 240),
  source_url text not null check (char_length(source_url) between 8 and 2000),
  source_name text not null default '' check (char_length(source_name) <= 240),
  trust_label text not null default 'user_saved',
  note text not null default '' check (char_length(note) <= 5000),
  opportunity_id text,
  created_at timestamptz not null default now()
);

create index if not exists opportunity_research_projects_owner_idx on public.opportunity_research_projects(owner_id, updated_at desc);
create index if not exists opportunity_research_sources_project_idx on public.opportunity_research_sources(project_id, created_at desc);

alter table public.opportunity_research_projects enable row level security;
alter table public.opportunity_research_sources enable row level security;

create policy "Users manage own opportunity research projects"
  on public.opportunity_research_projects for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Users read own opportunity research sources"
  on public.opportunity_research_sources for select
  using (
    exists (
      select 1 from public.opportunity_research_projects p
      where p.id = opportunity_research_sources.project_id and p.owner_id = auth.uid()
    )
  );

create policy "Users add sources to own opportunity research"
  on public.opportunity_research_sources for insert
  with check (
    added_by = auth.uid()
    and exists (
      select 1 from public.opportunity_research_projects p
      where p.id = opportunity_research_sources.project_id and p.owner_id = auth.uid()
    )
  );

create policy "Users delete sources from own opportunity research"
  on public.opportunity_research_sources for delete
  using (
    exists (
      select 1 from public.opportunity_research_projects p
      where p.id = opportunity_research_sources.project_id and p.owner_id = auth.uid()
    )
  );
