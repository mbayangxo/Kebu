-- Idempotency key for platform_jobs.
--
-- A nullable unique column that callers may populate to prevent duplicate job
-- creation (e.g., gift-card cancel recovery, digital fulfillment retry).
-- NULL values never conflict with each other.

alter table public.platform_jobs
  add column if not exists idempotency_key text;

create unique index if not exists platform_jobs_idempotency_key_idx
  on public.platform_jobs (idempotency_key)
  where idempotency_key is not null;

notify pgrst, 'reload schema';
