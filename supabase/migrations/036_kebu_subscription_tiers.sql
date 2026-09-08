-- Product tiers (free / starter / shop / business / pro / student)
-- Separate from billing_interval (monthly / yearly).

alter table public.site_subscriptions
  add column if not exists tier text not null default 'free';

alter table public.site_subscriptions
  add column if not exists billing_interval text not null default 'monthly';

-- Backfill: old "plan" column was monthly|yearly interval.
update public.site_subscriptions
set billing_interval = plan
where plan in ('monthly', 'yearly');

update public.site_subscriptions
set tier = 'shop'
where status = 'active'
  and amount_usd_cents >= 500
  and (tier is null or tier = 'free');

update public.site_subscriptions
set tier = 'starter'
where status = 'active'
  and amount_usd_cents > 0
  and amount_usd_cents < 500
  and (tier is null or tier = 'free');

do $$
begin
  alter table public.site_subscriptions drop constraint if exists site_subscriptions_plan_check;
exception
  when undefined_object then null;
end $$;

-- Keep plan as billing interval for backwards compatibility with existing code paths.
update public.site_subscriptions
set plan = billing_interval
where plan not in ('monthly', 'yearly');

alter table public.site_subscriptions
  drop constraint if exists site_subscriptions_plan_check;

alter table public.site_subscriptions
  add constraint site_subscriptions_plan_check
  check (plan in ('monthly', 'yearly'));

alter table public.site_subscriptions
  drop constraint if exists site_subscriptions_tier_check;

alter table public.site_subscriptions
  add constraint site_subscriptions_tier_check
  check (tier in ('free', 'student', 'starter', 'shop', 'business', 'pro'));

alter table public.site_subscriptions
  drop constraint if exists site_subscriptions_billing_interval_check;

alter table public.site_subscriptions
  add constraint site_subscriptions_billing_interval_check
  check (billing_interval in ('monthly', 'yearly'));

alter table public.site_subscriptions
  drop constraint if exists site_subscriptions_amount_usd_cents_check;

alter table public.site_subscriptions
  add constraint site_subscriptions_amount_usd_cents_check
  check (amount_usd_cents >= 0);

comment on column public.site_subscriptions.tier is
  'Product plan: free|student|starter|shop|business|pro';
comment on column public.site_subscriptions.billing_interval is
  'Charge cadence: monthly|yearly';
comment on column public.site_subscriptions.plan is
  'Legacy alias of billing_interval (monthly|yearly)';
