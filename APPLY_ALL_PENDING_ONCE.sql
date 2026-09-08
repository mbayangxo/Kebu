-- =============================================================================
-- Kebu — ONE FILE: paste this entire script into Supabase SQL Editor → Run once
-- Safe-ish to re-run (IF NOT EXISTS / DROP IF EXISTS). Skip errors that say already exists.
-- Includes: 010 (billing table if missing) + 027 + 034 + 035 + 036 + 037 + 038
-- Generated for founders who cannot open separate migration files.
-- =============================================================================

-- >>> 010 site billing (create tables if missing)

-- Kebu site hosting + template purchases via JOKO mobile money

alter table public.site_templates
  add column if not exists price_usd_cents integer not null default 0 check (price_usd_cents >= 0);

alter table public.site_templates
  add column if not exists requires_purchase boolean not null default false;

create table if not exists public.site_subscriptions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'past_due', 'cancelled', 'expired')),
  amount_usd_cents integer not null default 400 check (amount_usd_cents > 0),
  currency text not null default 'USD',
  period_start timestamptz,
  period_end timestamptz,
  joko_reference text,
  joko_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_subscriptions_project_status_idx
  on public.site_subscriptions (project_id, status, period_end desc);

create index if not exists site_subscriptions_owner_idx
  on public.site_subscriptions (owner_id, created_at desc);

create table if not exists public.template_purchases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  template_slug text not null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded')),
  amount_usd_cents integer not null default 0 check (amount_usd_cents >= 0),
  joko_reference text,
  joko_payment_id text,
  purchased_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_id, template_slug, joko_reference)
);

create index if not exists template_purchases_owner_slug_idx
  on public.template_purchases (owner_id, template_slug, status);

alter table public.site_subscriptions enable row level security;
alter table public.template_purchases enable row level security;

drop policy if exists "Owners select site subscriptions" on public.site_subscriptions;
create policy "Owners select site subscriptions"
  on public.site_subscriptions for select
  using (owner_id = auth.uid());

drop policy if exists "Owners insert pending site subscriptions" on public.site_subscriptions;
create policy "Owners insert pending site subscriptions"
  on public.site_subscriptions for insert
  with check (owner_id = auth.uid() and status = 'pending');

drop policy if exists "Owners select template purchases" on public.template_purchases;
create policy "Owners select template purchases"
  on public.template_purchases for select
  using (owner_id = auth.uid());

drop policy if exists "Owners insert pending template purchases" on public.template_purchases;
create policy "Owners insert pending template purchases"
  on public.template_purchases for insert
  with check (owner_id = auth.uid() and status = 'pending');

-- >>> 027 African ID

-- Afrique ID: personal identity linked to Kebu account (separate from Kebu ID / business)

create table if not exists public.afrique_ids (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_afrique_id text not null unique check (char_length(public_afrique_id) between 12 and 24),
  country_code char(2) not null,
  eligibility_status text not null default 'unverified' check (
    eligibility_status in (
      'unverified', 'pending', 'verified', 'rejected', 'expired', 'suspended', 'manual_review'
    )
  ),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists afrique_ids_public_id_idx on public.afrique_ids (public_afrique_id);

alter table public.afrique_ids enable row level security;

drop policy if exists "Users read own Afrique ID" on public.afrique_ids;
create policy "Users read own Afrique ID"
  on public.afrique_ids for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own Afrique ID" on public.afrique_ids;
create policy "Users insert own Afrique ID"
  on public.afrique_ids for insert
  with check (auth.uid() = user_id);

drop policy if exists "Public read verified Afrique ID cards" on public.afrique_ids;
create policy "Public read verified Afrique ID cards"
  on public.afrique_ids for select
  using (eligibility_status = 'verified');

drop trigger if exists afrique_ids_set_updated_at on public.afrique_ids;
create trigger afrique_ids_set_updated_at
  before update on public.afrique_ids
  for each row execute function public.set_updated_at();

drop policy if exists "Users request Afrique ID verification" on public.afrique_ids;
create policy "Users request Afrique ID verification"
  on public.afrique_ids for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and eligibility_status = 'pending');

grant select, insert, update on public.afrique_ids to authenticated;

-- >>> 034 site assets MIME

-- Expand site-assets MIME allowlist so phone JPEGs and common aliases upload reliably.
-- Safe to re-run. Does not change RLS.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-assets',
  'site-assets',
  true,
  52428800,
  array[
    'image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/x-png', 'image/webp', 'image/gif',
    'image/x-icon', 'image/vnd.microsoft.icon',
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/webm',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into public.builder_schema_meta (key, value)
values ('website_builder_version', '34')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- >>> 035 monthly autopay

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

-- >>> 036 tiers + $0 free

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

-- >>> 037 AID types

-- African ID (AID): product rename from "Afrique ID".
-- Table `afrique_ids` kept for compatibility; public brand = African ID / AID.
-- Types: indigenous (Indigenous African person) | visitor.

alter table public.afrique_ids
  add column if not exists identity_type text not null default 'visitor';

alter table public.afrique_ids
  drop constraint if exists afrique_ids_identity_type_check;

alter table public.afrique_ids
  add constraint afrique_ids_identity_type_check
  check (identity_type in ('indigenous', 'visitor'));

-- Public IDs: legacy AFRI-… still valid; new allocations use AID-… (see app).
-- Slightly widen length check for AID-V-CC-01-XXXXXX style if used later.
alter table public.afrique_ids
  drop constraint if exists afrique_ids_public_afrique_id_check;

alter table public.afrique_ids
  add constraint afrique_ids_public_afrique_id_check
  check (char_length(public_afrique_id) between 12 and 28);

comment on table public.afrique_ids is
  'African ID (AID) — personal identity on Kebu (not Kebu ID / business). identity_type: indigenous|visitor.';

comment on column public.afrique_ids.identity_type is
  'indigenous = Indigenous African person; visitor = visitor / non-indigenous account type.';

comment on column public.afrique_ids.public_afrique_id is
  'Public African ID string. New: AID-{CC}-01-XXXXXX (legacy AFRI-… still accepted).';

-- >>> 038 Free publish RLS (required)

-- Free hosting entitlement: owners may insert active Free ($0) rows.
-- Migration 010 only allowed status = 'pending', so ensureFreeHostingEntitlement
-- failed under RLS and publish returned 402 for non-exempt users.

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

-- =============================================================================
-- DONE. Then publish a site on Free.
-- =============================================================================
