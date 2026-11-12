-- Reconciled against the live Kebu database before application.
-- Suspended deployments must not remain publicly readable.
drop policy if exists "Public read live or suspended deployments" on public.deployments;
drop policy if exists "Public read live deployments" on public.deployments;
create policy "Public read live deployments"
  on public.deployments for select
  using (status = 'live');

-- Harden helper functions flagged by the Supabase security advisor.
alter function public.update_updated_at() set search_path = public, pg_temp;
alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.touch_updated_at() set search_path = public, pg_temp;
