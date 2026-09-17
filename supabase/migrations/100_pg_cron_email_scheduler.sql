-- 100: Schedule email automation jobs via Supabase pg_cron + pg_net
--
-- Background: Vercel Hobby plan allows cron jobs to fire at most once per day.
-- Two email automation jobs need sub-daily frequency:
--   • process-email-flows: hourly  (0 * * * *)
--   • cart-abandonment:    2-hourly (0 */2 * * *)
-- This migration moves scheduling to Supabase while the HTTP endpoints and all
-- business logic remain unchanged in the Next.js application layer.
--
-- ─── PRE-REQUISITE: EXTENSIONS ───────────────────────────────────────────────
-- pg_cron and pg_net require superuser to install. Enable them from the
-- Supabase Dashboard BEFORE applying this migration:
--
--   Dashboard → Database → Extensions → pg_cron → Enable
--   Dashboard → Database → Extensions → pg_net  → Enable
--
-- If the extensions are not yet enabled, this migration will fail with
-- "permission denied to create extension" — enabling them first and
-- re-running the migration will succeed.
--
-- ─── PRE-REQUISITE: VAULT SECRETS ────────────────────────────────────────────
-- Store the two runtime secrets ONCE in the Supabase SQL Editor.
-- These statements must be run as the postgres role (the default in the
-- Supabase Dashboard SQL Editor).
--
-- FIRST-TIME SETUP — run only if the secrets do not already exist:
--
--   1. Verify no existing secrets with these names:
--
--        SELECT id, name, created_at
--        FROM vault.secrets
--        WHERE name IN ('kebu_app_url', 'kebu_cron_secret');
--
--      Expected: 0 rows. If rows appear, skip creation and use the rotation
--      procedure below instead.
--
--   2. Create the secrets:
--
--        SELECT vault.create_secret(
--          'https://your-production-domain.vercel.app',  -- no trailing slash
--          'kebu_app_url'
--        );
--
--        SELECT vault.create_secret(
--          'your-CRON_SECRET-value',
--          'kebu_cron_secret'
--        );
--
--      vault.create_secret signature: (new_secret text, new_name text, ...)
--      First argument is the secret value; second is the lookup name.
--
-- ROTATION (updating an existing secret):
--
--   vault.secrets.name is NOT unique. Calling vault.create_secret() again with
--   the same name creates a duplicate row. Duplicate names cause this cron job
--   to fail at runtime with "ERROR: more than one row returned by a subquery".
--   Use the official rotation function instead:
--
--   1. Retrieve the secret's UUID:
--
--        SELECT id, name FROM vault.secrets
--        WHERE name = 'kebu_cron_secret';
--
--   2. Update only that secret by its UUID:
--
--        SELECT vault.update_secret(
--          '<uuid-from-step-1>',   -- secret_id
--          'new-CRON_SECRET-value' -- new_secret
--        );
--
--      vault.update_secret signature: (secret_id uuid, new_secret text, ...)
--
--   Apply the same procedure to 'kebu_app_url' when the production domain changes.
--
-- VERIFYING EXACTLY ONE SECRET EXISTS PER NAME (run after setup):
--
--   SELECT name, count(*) AS rows
--   FROM vault.secrets
--   WHERE name IN ('kebu_app_url', 'kebu_cron_secret')
--   GROUP BY name;
--
--   Expected: 2 rows, each with rows = 1.
--   If any name has rows > 1, a duplicate exists. Remove the stale entry:
--
--   DELETE FROM vault.secrets
--   WHERE name = 'kebu_cron_secret'
--     AND id <> (
--       SELECT id FROM vault.secrets
--       WHERE name = 'kebu_cron_secret'
--       ORDER BY updated_at DESC
--       LIMIT 1
--     );
--
-- ─── HOW IT WORKS ────────────────────────────────────────────────────────────
-- pg_cron fires on schedule → pg_net issues HTTP GET to the Next.js endpoint →
-- requireCronSecret() validates the Bearer token → business logic runs unchanged.
-- Responses are logged by recordPlatformCronRun() inside each route handler.
--
-- The vault secrets are read at cron fire time, not at schedule time. Rotating
-- either secret takes effect on the next firing without re-applying this migration.
--
-- If a vault secret is missing or duplicated, net.http_get() either receives a
-- null URL (fails immediately) or an incorrect Authorization header (route returns
-- 401). Neither case writes any data or sends any email. The failure is logged in
-- cron.job_run_details and net._http_response.

-- Guards: verify extensions are installed before proceeding.
-- Both require superuser to install and must be Dashboard-enabled beforehand.
-- These lines are no-ops when already installed; they fail with a clear
-- permission error if the Dashboard step was skipped.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove previously scheduled versions of these jobs (idempotent re-apply).
-- Unschedules before re-scheduling so a second migration run does not create
-- duplicate cron entries.
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
--
-- The vault sub-queries run at fire time. If either secret is missing, the
-- sub-query returns NULL, string concatenation with NULL produces NULL, and
-- net.http_get() fails immediately — no request is made, no data is written.
-- If either name matches more than one row, the scalar sub-query raises an error
-- ("more than one row returned by a subquery"), which is logged in
-- cron.job_run_details. This is intentional: fail loudly, not silently.
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
