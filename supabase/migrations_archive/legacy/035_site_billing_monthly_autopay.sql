-- Monthly hosting renewals, autopay preference, and suspended live sites when unpaid.

alter table public.site_subscriptions
  alter column amount_usd_cents set default 300;

alter table public.site_subscriptions
  add column if not exists plan text not null default 'monthly'
    check (plan in ('monthly', 'yearly'));

alter table public.site_subscriptions
  add column if not exists autopay_enabled boolean not null default false;

alter table public.site_subscriptions
  add column if not exists autopay_consent_at timestamptz;

alter table public.site_subscriptions
  add column if not exists next_billing_at timestamptz;

alter table public.site_subscriptions
  add column if not exists last_renewal_attempt_at timestamptz;

alter table public.site_subscriptions
  add column if not exists pending_checkout_url text;

create index if not exists site_subscriptions_autopay_due_idx
  on public.site_subscriptions (status, autopay_enabled, period_end)
  where autopay_enabled = true;

-- Owners may toggle autopay / cancel their own rows (not invent active paid periods).
drop policy if exists "Owners update own site subscriptions" on public.site_subscriptions;
create policy "Owners update own site subscriptions"
  on public.site_subscriptions for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Suspended = was live, hosting lapsed until they pay again.
do $$
begin
  alter table public.deployments drop constraint if exists deployments_status_check;
exception
  when undefined_object then null;
end $$;

alter table public.deployments
  drop constraint if exists deployments_status_check;

alter table public.deployments
  add constraint deployments_status_check
  check (status in ('live', 'superseded', 'failed', 'suspended'));

-- Public may read suspended deployments so we can show the “pay to restore” page.
do $$
begin
  if to_regclass('public.deployments') is null then
    raise notice 'deployments table missing — skip public read policy';
    return;
  end if;
  execute 'drop policy if exists "Public read live deployments" on public.deployments';
  execute 'drop policy if exists "Public read live or suspended deployments" on public.deployments';
  execute $policy$
    create policy "Public read live or suspended deployments"
      on public.deployments for select
      using (status in ('live', 'suspended'))
  $policy$;
end $$;

comment on column public.site_subscriptions.autopay_enabled is
  'Founder opted in to monthly auto-renew. Cron creates JOKO checkout / charge before period_end.';
