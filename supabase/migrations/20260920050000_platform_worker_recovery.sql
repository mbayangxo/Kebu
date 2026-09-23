-- Track B durable worker recovery and notification idempotency.
alter table public.user_notifications add column if not exists source_job_id uuid;
create unique index if not exists user_notifications_source_job_uidx
  on public.user_notifications(source_job_id) where source_job_id is not null;

create or replace function public.claim_platform_jobs(p_worker text, p_limit integer default 10)
returns setof public.platform_jobs
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  -- A crashed worker must not strand work forever. Requeue stale locks before claiming.
  update public.platform_jobs
     set status = case when attempts >= max_attempts then 'dead' else 'failed' end,
         locked_at = null,
         locked_by = null,
         last_error = coalesce(last_error, 'Worker lease expired before completion'),
         run_after = case when attempts >= max_attempts then run_after else now() end,
         completed_at = case when attempts >= max_attempts then now() else completed_at end
   where status = 'running' and locked_at < now() - interval '10 minutes';

  return query
  update public.platform_jobs j
     set status='running', attempts=attempts+1, locked_at=now(), locked_by=p_worker
   where j.id in (
     select id from public.platform_jobs
      where status in ('queued','failed') and run_after<=now() and attempts<max_attempts
      order by priority asc, run_after asc, created_at asc
      for update skip locked
      limit greatest(1,least(p_limit,50))
   )
  returning j.*;
end; $$;
revoke all on function public.claim_platform_jobs(text, integer) from public, anon, authenticated;
grant execute on function public.claim_platform_jobs(text, integer) to service_role;

-- Operational/domain events are append-only even for service-role callers.
create or replace function public.reject_platform_event_mutation()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin raise exception 'platform_events are append-only'; end; $$;
drop trigger if exists platform_events_immutable on public.platform_events;
create trigger platform_events_immutable before update or delete on public.platform_events
for each row execute function public.reject_platform_event_mutation();

-- Authenticated users may acknowledge notifications, but may not rewrite their contents.
revoke update on public.user_notifications from authenticated;
grant update(read_at) on public.user_notifications to authenticated;
