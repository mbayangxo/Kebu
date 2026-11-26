-- High-frequency Mail workers run in Supabase Cron rather than Vercel Cron.
-- This keeps minute-level delivery/health processing available even when the
-- Vercel plan only permits daily cron schedules. Secrets remain in Vault.

select cron.unschedule(jobid)
from cron.job
where jobname in ('kebu-mail-delivery','kebu-mail-health');

select cron.schedule(
  'kebu-mail-delivery',
  '* * * * *',
  $job$
    select net.http_get(
      url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'kebu_app_url'), '/') || '/api/cron/mail-delivery',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'kebu_cron_secret')
      ),
      timeout_milliseconds := 55000
    ) as request_id;
  $job$
);

select cron.schedule(
  'kebu-mail-health',
  '*/5 * * * *',
  $job$
    select net.http_get(
      url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'kebu_app_url'), '/') || '/api/cron/mail-health',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'kebu_cron_secret')
      ),
      timeout_milliseconds := 15000
    ) as request_id;
  $job$
);
