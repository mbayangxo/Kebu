-- Platform worker infrastructure (Item 1).
--
-- Creates the platform_jobs table and claim_platform_jobs RPC used by
-- lib/platform/worker.ts.  The claim function uses SKIP LOCKED so that
-- multiple concurrent worker invocations never double-process the same job.

create table if not exists public.platform_jobs (
  id             uuid primary key default gen_random_uuid(),
  job_type       text not null,
  payload        jsonb not null default '{}',
  status         text not null default 'pending'
                   check (status in ('pending','processing','succeeded','failed')),
  attempts       integer not null default 0,
  max_attempts   integer not null default 5,
  run_after      timestamptz,
  locked_at      timestamptz,
  locked_by      text,
  last_error     text,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Claim up to p_limit pending jobs that are ready to run, marking them
-- processing and locking them to this worker instance.  SKIP LOCKED
-- prevents two concurrent workers from claiming the same row.
create or replace function public.claim_platform_jobs(
  p_worker  text,
  p_limit   integer default 10
)
returns setof public.platform_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    update public.platform_jobs
       set status    = 'processing',
           locked_at = now(),
           locked_by = p_worker,
           attempts  = attempts + 1,
           updated_at = now()
     where id in (
       select id
         from public.platform_jobs
        where status    = 'pending'
          and (run_after is null or run_after <= now())
        order by created_at
        limit p_limit
          for update skip locked
     )
     returning *;
end;
$$;

revoke all on function public.claim_platform_jobs(text, integer)
  from public, anon, authenticated;
grant execute on function public.claim_platform_jobs(text, integer)
  to service_role;

-- RLS: platform_jobs are only accessible by service_role.
alter table public.platform_jobs enable row level security;

revoke all on table public.platform_jobs from public, anon, authenticated;
grant all on table public.platform_jobs to service_role;
