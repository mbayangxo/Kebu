-- 100: Schedule email automation jobs via Supabase pg_cron + pg_net
--
-- Background: Vercel Hobby plan allows cron jobs to fire at most once per day.
-- Two email automation jobs need sub-daily frequency:
--   • process-email-flows: hourly  (0 * * * *)
--   • cart-abandonment:    2-hourly (0 */2 * * *)
-- This migration moves scheduling to Supabase while the HTTP endpoints and all
-- business logic remain unchanged in the Next.js application layer.
--
-- ─── PRE-REQUISITES ──────────────────────────────────────────────────────────
-- Enable both extensions from the Supabase Dashboard before applying:
--   Dashboard → Database → Extensions → pg_cron  → Enable
--   Dashboard → Database → Extensions → pg_net   → Enable
--
-- ─── AFTER APPLYING ──────────────────────────────────────────────────────────
-- Run the following two statements once per environment (dev / staging / prod)
-- in the Supabase SQL Editor, substituting real values:
--
--   select vault.create_secret(
--     'https://your-app.vercel.app',    -- NEXT_PUBLIC_APP_URL value
--     'kebu_app_url'
--   );
--
--   select vault.create_secret(
--     'your-CRON_SECRET-value',         -- CRON_SECRET env var value
--     'kebu_cron_secret'
--   );
--
-- To verify the jobs were scheduled:
--   select jobid, jobname, schedule, active from cron.job;
--
-- ─── HOW IT WORKS ────────────────────────────────────────────────────────────
-- pg_cron fires on schedule → pg_net issues HTTP GET to the Next.js endpoint →
-- requireCronSecret() validates the Bearer token → business logic runs unchanged.
-- Responses are logged by recordPlatformCronRun() inside each route handler.
-- If vault secrets are not yet set, the HTTP call will be rejected by the route's
-- auth guard (fail-safe: no emails are sent, no data is written).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove previously scheduled versions of these jobs (idempotent re-apply)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'kebu-process-email-flows') then
    perform cron.unschedule('kebu-process-email-flows');
  end if;
  if exists (select 1 from cron.job where jobname = 'kebu-cart-abandonment') then
    perform cron.unschedule('kebu-cart-abandonment');
  end if;
end $$;

-- Job 1: Process due email flow enrollments — every hour
-- Replaces Vercel cron entry: { "path": "/api/cron/process-email-flows", "schedule": "0 * * * *" }
select cron.schedule(
  'kebu-process-email-flows',
  '0 * * * *',
  $cron$
  select net.http_get(
    url     => (select decrypted_secret
                from vault.decrypted_secrets
                where name = 'kebu_app_url') || '/api/cron/process-email-flows',
    headers => jsonb_build_object(
                 'Authorization',
                 'Bearer ' || (select decrypted_secret
                               from vault.decrypted_secrets
                               where name = 'kebu_cron_secret')
               ),
    timeout_milliseconds => 55000
  );
  $cron$
);

-- Job 2: Enroll abandoned carts in email flows — every 2 hours
-- Replaces Vercel cron entry: { "path": "/api/cron/cart-abandonment", "schedule": "0 */2 * * *" }
select cron.schedule(
  'kebu-cart-abandonment',
  '0 */2 * * *',
  $cron$
  select net.http_get(
    url     => (select decrypted_secret
                from vault.decrypted_secrets
                where name = 'kebu_app_url') || '/api/cron/cart-abandonment',
    headers => jsonb_build_object(
                 'Authorization',
                 'Bearer ' || (select decrypted_secret
                               from vault.decrypted_secrets
                               where name = 'kebu_cron_secret')
               ),
    timeout_milliseconds => 55000
  );
  $cron$
);
