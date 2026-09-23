-- Stale-job recovery for the platform worker.
--
-- A job that stays in 'processing' beyond lock_timeout_minutes is considered
-- crashed (worker died, container recycled, etc.).  The next claim_platform_jobs
-- call resets it to 'pending' so it can be retried, up to max_attempts.
--
-- This closes the gap where a processing job with no live worker would stay
-- stuck forever, blocking dependent flows (e.g. payment.refund never retried).

-- ─── 1. Add lock_timeout_minutes column ──────────────────────────────────────

alter table public.platform_jobs
  add column if not exists lock_timeout_minutes integer not null default 15;

-- ─── 2. Update claim_platform_jobs to auto-reclaim timed-out rows ─────────────
-- A processing row is stale when:
--   locked_at is not null
--   AND now() - locked_at > lock_timeout_minutes
--   AND attempts < max_attempts   (exhausted jobs stay failed)
--
-- Stale rows are reset to pending *before* the new batch is claimed, so a
-- single call handles both reclaim and immediate re-claim in one round-trip.

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
  -- Reset stale processing rows back to pending.
  update public.platform_jobs
     set status     = 'pending',
         locked_at  = null,
         locked_by  = null,
         last_error = coalesce(last_error, '') ||
                      ' [auto-reclaimed after lock timeout at ' || now()::text || ']',
         run_after  = null,
         updated_at = now()
   where status    = 'processing'
     and locked_at is not null
     and now() - locked_at > make_interval(mins => lock_timeout_minutes)
     and attempts  < max_attempts;

  -- Claim up to p_limit pending jobs that are ready to run.
  return query
    update public.platform_jobs
       set status     = 'processing',
           locked_at  = now(),
           locked_by  = p_worker,
           attempts   = attempts + 1,
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

notify pgrst, 'reload schema';
