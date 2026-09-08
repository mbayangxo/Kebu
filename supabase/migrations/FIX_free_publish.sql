-- Free publish unblock: tier columns + amount >= 0 + RLS for active Free ($0).
-- Paste alone in Supabase SQL Editor if Publish says apply 036/038.
-- Same rules as 036_kebu_subscription_tiers + 038_free_hosting_entitlement_rls.

alter table public.site_subscriptions
  add column if not exists tier text not null default 'free';

alter table public.site_subscriptions
  add column if not exists billing_interval text not null default 'monthly';

update public.site_subscriptions
set billing_interval = plan
where plan in ('monthly', 'yearly')
  and (billing_interval is null or billing_interval = 'monthly');

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

drop policy if exists "Owners insert pending site subscriptions" on public.site_subscriptions;
drop policy if exists "Owners insert site subscriptions" on public.site_subscriptions;

create policy "Owners insert site subscriptions"
  on public.site_subscriptions for insert
  with check (
    owner_id = auth.uid()
    and (
      status = 'pending'
      or (
        status = 'active'
        and coalesce(tier, 'free') = 'free'
        and amount_usd_cents = 0
      )
    )
  );

comment on policy "Owners insert site subscriptions" on public.site_subscriptions is
  'Owners start paid JOKO checkouts as pending, or claim Free (active, $0) without a card.';
