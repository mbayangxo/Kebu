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
