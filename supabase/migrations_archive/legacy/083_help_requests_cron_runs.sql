-- Platform ops: help requests + cron run log (Kebu Record admin)
-- Depends on: auth.users (optional user_id)

create table if not exists public.help_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  subject text not null,
  body text not null,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'helped', 'closed')),
  source text not null default 'contact'
    check (source in ('contact', 'help', 'in_app', 'email')),
  helped_at timestamptz,
  helped_by text,
  staff_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists help_requests_status_created_idx
  on public.help_requests (status, created_at desc);

create index if not exists help_requests_created_idx
  on public.help_requests (created_at desc);

create table if not exists public.platform_cron_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status text not null check (status in ('ok', 'error', 'partial')),
  summary jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz not null,
  finished_at timestamptz not null default now()
);

create index if not exists platform_cron_runs_job_finished_idx
  on public.platform_cron_runs (job_name, finished_at desc);

alter table public.help_requests enable row level security;
alter table public.platform_cron_runs enable row level security;

-- Public submit via service role only; owners can read own rows when signed in.
drop policy if exists "Users read own help requests" on public.help_requests;
create policy "Users read own help requests"
  on public.help_requests for select
  using (user_id is not null and user_id = auth.uid());

revoke all on public.help_requests from anon;
grant select on public.help_requests to authenticated;
grant all on public.help_requests to service_role;

revoke all on public.platform_cron_runs from anon, authenticated;
grant all on public.platform_cron_runs to service_role;

notify pgrst, 'reload schema';
