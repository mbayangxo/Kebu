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
