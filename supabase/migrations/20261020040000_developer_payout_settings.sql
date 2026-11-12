-- Real developer payout settings and ledger.
--
-- developer_profiles is the one shared seller identity across the aesthetics/
-- template marketplace (app/api/aesthetics/*) and the Studio Creative Assets
-- Marketplace (app/api/studio/creative-assets/*) — adding payout fields here
-- once covers both, rather than inventing a second identity.
--
-- This is a real payout DESTINATION + REQUEST system: a developer records
-- where their money should go (Wave or Orange Money number), and a payout
-- request is a real, durably-recorded row an admin (or, once configured,
-- lib/payments/payout-adapter.ts) actually processes. It is not a balance
-- a developer can spend or a promise of instant transfer — no automated
-- disbursement credentials exist in this environment; see payout-adapter.ts
-- for exactly what that would take and what is already wired defensively.
--
-- Paid listings (price_cents > 0) on marketplace_creative_assets are allowed
-- only once a developer has a real payout destination on file — enforced at
-- the database layer (RLS), not just application code, mirroring every
-- other money-adjacent rule added this session.

alter table public.developer_profiles
  add column if not exists payout_method text check (payout_method is null or payout_method in ('wave', 'orange_money')),
  add column if not exists payout_phone text check (payout_phone is null or char_length(payout_phone) between 8 and 20),
  add column if not exists payout_account_name text check (payout_account_name is null or char_length(trim(payout_account_name)) between 1 and 80);

-- A developer has a usable payout destination only when method + phone + the
-- name on the account are all present together — partial setup is not usable.
create or replace function public.developer_has_payout_destination(p_developer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.developer_profiles dp
    where dp.id = p_developer_id
      and dp.payout_method is not null
      and dp.payout_phone is not null
      and dp.payout_account_name is not null
  );
$$;

grant execute on function public.developer_has_payout_destination(uuid) to authenticated, service_role;

-- Loosen the free-only constraint added in 20261020030000: a paid listing is
-- allowed once (and only once) its developer has a real payout destination.
drop policy if exists "Approved developers manage own creative assets" on public.marketplace_creative_assets;
create policy "Approved developers manage own creative assets"
  on public.marketplace_creative_assets for all
  using (
    exists (
      select 1 from public.developer_profiles dp
      where dp.id = marketplace_creative_assets.developer_id
        and dp.user_id = auth.uid()
        and dp.status = 'approved'
    )
  )
  with check (
    exists (
      select 1 from public.developer_profiles dp
      where dp.id = marketplace_creative_assets.developer_id
        and dp.user_id = auth.uid()
        and dp.status = 'approved'
    )
    and (price_cents = 0 or public.developer_has_payout_destination(developer_id))
  );

-- Real, durable payout requests — one row per request, never a spendable balance.
create table if not exists public.developer_payouts (
  id uuid primary key default gen_random_uuid(),
  developer_id uuid not null references public.developer_profiles(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'XOF' check (currency in ('XOF', 'USD')),
  method text not null check (method in ('wave', 'orange_money')),
  destination_phone text not null,
  destination_account_name text not null,
  status text not null default 'requested'
    check (status in ('requested', 'processing', 'paid', 'failed')),
  provider_reference text,
  failure_reason text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references auth.users(id),
  note text
);

create index if not exists idx_developer_payouts_developer on public.developer_payouts(developer_id, requested_at desc);
create index if not exists idx_developer_payouts_status on public.developer_payouts(status);

alter table public.developer_payouts enable row level security;

drop policy if exists "Developers read own payout requests" on public.developer_payouts;
create policy "Developers read own payout requests"
  on public.developer_payouts for select
  using (
    exists (
      select 1 from public.developer_profiles dp
      where dp.id = developer_payouts.developer_id and dp.user_id = auth.uid()
    )
  );

drop policy if exists "Developers request their own payout" on public.developer_payouts;
create policy "Developers request their own payout"
  on public.developer_payouts for insert
  with check (
    exists (
      select 1 from public.developer_profiles dp
      where dp.id = developer_payouts.developer_id
        and dp.user_id = auth.uid()
        and dp.status = 'approved'
        and dp.payout_method = developer_payouts.method
        and dp.payout_phone = developer_payouts.destination_phone
        and dp.payout_account_name = developer_payouts.destination_account_name
    )
  );

-- Only service_role (admin API routes) transitions a payout's status — never the developer themself.
grant select, insert on public.developer_payouts to authenticated;
grant select, insert, update on public.developer_payouts to service_role;
