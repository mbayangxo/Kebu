create table if not exists public.site_connections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('instagram','tiktok','youtube','whatsapp','maps','analytics','custom')),
  label text not null default '',
  status text not null default 'configured' check (status in ('configured','needs_auth','connected','disabled','error')),
  public_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, provider)
);
create index if not exists site_connections_project_id_idx on public.site_connections(project_id);
create index if not exists site_connections_owner_id_idx on public.site_connections(owner_id);
alter table public.site_connections enable row level security;
create policy "site connections select" on public.site_connections for select to authenticated using ((select auth.uid()) = owner_id);
create policy "site connections insert" on public.site_connections for insert to authenticated with check ((select auth.uid()) = owner_id and exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())));
create policy "site connections update" on public.site_connections for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id and exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())));
create policy "site connections delete" on public.site_connections for delete to authenticated using ((select auth.uid()) = owner_id);
