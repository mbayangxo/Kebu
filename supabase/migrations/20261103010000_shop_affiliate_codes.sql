-- Shop affiliate codes — real attribution/bookkeeping, distinct from discount
-- codes (044_shop_discount_codes.sql). An affiliate code never changes order
-- price (no percent_off, no checkout-time rejection on an unknown code —
-- see lib/shop/affiliates.ts): it only records which affiliate drove a sale,
-- so a merchant can see attributed orders/revenue per code and settle a
-- commission themselves. Deliberately does not touch shop_discount_codes,
-- the checkout pricing path, or automate any payout — that stays the
-- merchant's own manual step, same honesty standard as developer_payouts
-- (20261020040000_developer_payout_settings.sql).

create table if not exists public.shop_affiliate_codes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  code text not null,
  affiliate_name text not null check (char_length(trim(affiliate_name)) between 1 and 80),
  commission_percent integer check (commission_percent is null or (commission_percent >= 1 and commission_percent <= 90)),
  is_active boolean not null default true,
  uses_count integer not null default 0 check (uses_count >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, code)
);

create index if not exists shop_affiliate_codes_project_idx
  on public.shop_affiliate_codes (project_id, is_active);

alter table public.shop_orders
  add column if not exists affiliate_code text;

create index if not exists shop_orders_affiliate_code_idx
  on public.shop_orders (project_id, affiliate_code)
  where affiliate_code is not null;

alter table public.shop_affiliate_codes enable row level security;

drop policy if exists "Owners manage shop affiliate codes" on public.shop_affiliate_codes;
create policy "Owners manage shop affiliate codes"
  on public.shop_affiliate_codes for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_affiliate_codes.project_id
        and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = shop_affiliate_codes.project_id
        and p.owner_id = auth.uid()
    )
  );

-- The checkout path resolves an affiliate code with the service_role admin
-- client (same as discount codes) — it never runs as the shopper.
grant select, insert, update, delete on public.shop_affiliate_codes to authenticated, service_role;

drop trigger if exists shop_affiliate_codes_set_updated_at on public.shop_affiliate_codes;
create trigger shop_affiliate_codes_set_updated_at
  before update on public.shop_affiliate_codes
  for each row execute function public.set_updated_at();
