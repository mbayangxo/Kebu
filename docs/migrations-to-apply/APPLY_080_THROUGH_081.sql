-- Studio video: expand edit_mode for storyboard + quick_edit paths
-- Depends on: 075_studio_video_projects

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'studio_video_projects_edit_mode_check'
  ) then
    alter table public.studio_video_projects drop constraint studio_video_projects_edit_mode_check;
  end if;
exception when undefined_table then
  null;
end $$;

alter table public.studio_video_projects
  drop constraint if exists studio_video_projects_edit_mode_check;

alter table public.studio_video_projects
  add constraint studio_video_projects_edit_mode_check
  check (edit_mode in ('quick_edit', 'smart_edit', 'full_timeline', 'storyboard'));

notify pgrst, 'reload schema';
-- Account AI metering (monthly plan generations)
-- Depends on: auth.users

create table if not exists public.account_ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in (
    'website_ai_generate',
    'website_ai_improve',
    'studio_generate'
  )),
  project_id uuid references public.projects(id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists account_ai_usage_owner_period_idx
  on public.account_ai_usage_events (owner_id, created_at desc);

alter table public.account_ai_usage_events enable row level security;

drop policy if exists "Owners manage own AI usage" on public.account_ai_usage_events;
create policy "Owners manage own AI usage"
  on public.account_ai_usage_events for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

grant select, insert on public.account_ai_usage_events to authenticated;
grant all on public.account_ai_usage_events to service_role;

notify pgrst, 'reload schema';
