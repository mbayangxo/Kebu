-- Site analytics for owner dashboards (pageviews, vitals, client errors).
-- Ingest is server-only (service role). Owners read via RLS.

create table if not exists public.site_analytics_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subdomain text not null,
  event_type text not null
    check (event_type in ('pageview', 'vital', 'error', 'perf')),
  path text not null default '/',
  device text
    check (device is null or device in ('desktop', 'tablet', 'mobile')),
  metric_name text,
  metric_value double precision,
  message text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists site_analytics_events_project_created_idx
  on public.site_analytics_events (project_id, created_at desc);

create index if not exists site_analytics_events_project_type_idx
  on public.site_analytics_events (project_id, event_type, created_at desc);

create index if not exists site_analytics_events_subdomain_created_idx
  on public.site_analytics_events (subdomain, created_at desc);

alter table public.site_analytics_events enable row level security;

drop policy if exists "Owners read site analytics" on public.site_analytics_events;
create policy "Owners read site analytics"
  on public.site_analytics_events for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = site_analytics_events.project_id
        and p.owner_id = auth.uid()
    )
  );

-- No insert/update/delete for authenticated clients — ingest via service role API only.
