-- Track B: durable platform primitives. Service-role writes only unless explicitly user-scoped.

create table if not exists public.platform_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (char_length(event_type) between 3 and 120),
  aggregate_type text,
  aggregate_id uuid,
  project_id uuid references public.projects(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  idempotency_key text unique,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists platform_events_project_time_idx on public.platform_events(project_id, occurred_at desc);
create index if not exists platform_events_type_time_idx on public.platform_events(event_type, occurred_at desc);

create table if not exists public.platform_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null check (char_length(job_type) between 3 and 120),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','dead')),
  priority smallint not null default 100,
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 25),
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists platform_jobs_claim_idx on public.platform_jobs(status, run_after, priority, created_at)
  where status in ('queued','failed');

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  kind text not null,
  title text not null check (char_length(title) between 1 and 160),
  body text not null default '',
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists user_notifications_user_time_idx on public.user_notifications(user_id, created_at desc);

create table if not exists public.platform_feature_flags (
  key text primary key check (key ~ '^[a-z0-9][a-z0-9._-]{1,99}$'),
  enabled boolean not null default false,
  description text not null default '',
  rollout_percent smallint not null default 0 check (rollout_percent between 0 and 100),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_feature_flag_overrides (
  flag_key text not null references public.platform_feature_flags(key) on delete cascade,
  subject_type text not null check (subject_type in ('user','project')),
  subject_id uuid not null,
  enabled boolean not null,
  created_at timestamptz not null default now(),
  primary key (flag_key, subject_type, subject_id)
);

create table if not exists public.platform_usage_daily (
  usage_date date not null default current_date,
  project_id uuid not null references public.projects(id) on delete cascade,
  metric text not null check (char_length(metric) between 1 and 80),
  quantity bigint not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (usage_date, project_id, metric)
);

alter table public.platform_events enable row level security;
alter table public.platform_jobs enable row level security;
alter table public.user_notifications enable row level security;
alter table public.platform_feature_flags enable row level security;
alter table public.platform_feature_flag_overrides enable row level security;
alter table public.platform_usage_daily enable row level security;

revoke all on public.platform_events, public.platform_jobs, public.platform_feature_flags,
  public.platform_feature_flag_overrides, public.platform_usage_daily from public, anon, authenticated;
grant all on public.platform_events, public.platform_jobs, public.platform_feature_flags,
  public.platform_feature_flag_overrides, public.platform_usage_daily to service_role;

revoke all on public.user_notifications from public, anon;
grant select, update on public.user_notifications to authenticated;
grant all on public.user_notifications to service_role;

create policy "Users read own notifications" on public.user_notifications for select
  using (user_id = auth.uid());
create policy "Users mark own notifications read" on public.user_notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.claim_platform_jobs(p_worker text, p_limit integer default 10)
returns setof public.platform_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  update public.platform_jobs j
  set status = 'running',
      attempts = attempts + 1,
      locked_at = now(),
      locked_by = p_worker
  where j.id in (
    select id from public.platform_jobs
    where status in ('queued','failed')
      and run_after <= now()
      and attempts < max_attempts
    order by priority asc, run_after asc, created_at asc
    for update skip locked
    limit greatest(1, least(p_limit, 50))
  )
  returning j.*;
end;
$$;
revoke all on function public.claim_platform_jobs(text, integer) from public, anon, authenticated;
grant execute on function public.claim_platform_jobs(text, integer) to service_role;

create or replace function public.increment_platform_usage(
  p_project_id uuid, p_metric text, p_quantity bigint default 1
) returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_quantity bigint;
begin
  if p_quantity <= 0 then raise exception 'quantity must be positive'; end if;
  insert into public.platform_usage_daily(usage_date, project_id, metric, quantity)
  values (current_date, p_project_id, p_metric, p_quantity)
  on conflict (usage_date, project_id, metric)
  do update set quantity = platform_usage_daily.quantity + excluded.quantity, updated_at = now()
  returning quantity into v_quantity;
  return v_quantity;
end;
$$;
revoke all on function public.increment_platform_usage(uuid, text, bigint) from public, anon, authenticated;
grant execute on function public.increment_platform_usage(uuid, text, bigint) to service_role;
