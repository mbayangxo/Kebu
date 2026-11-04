-- Real merchant-defined shipping options, chosen by the buyer at checkout.
--
-- Before this, Shop had only a static, non-configurable cross-border cost
-- *estimate* (lib/shop/shipping-corridors.ts) that was never added to the
-- amount actually charged — shop_orders.amount_xof was computed before the
-- shipping quote was even looked up. Sellers had no way to tell buyers what
-- shipping choices exist, and buyers had no choice to make. This migration
-- adds the real, seller-owned catalog of named options; lib/shop/cart-order.ts
-- is the enforcement point that folds a chosen option's price into the real
-- charged total, looked up server-side by id — never trusted from the client.

create table if not exists public.shop_shipping_options (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  amount_xof integer not null default 0 check (amount_xof >= 0),
  eta_min_days integer check (eta_min_days is null or eta_min_days >= 0),
  eta_max_days integer check (eta_max_days is null or eta_max_days >= eta_min_days),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_shipping_options_project_idx
  on public.shop_shipping_options (project_id, active, sort_order);

alter table public.shop_shipping_options enable row level security;

-- Dashboard access only — the public checkout path reads through the
-- service-role client in app/api/public/sites/[subdomain]/shipping-options,
-- the same split already used for shop_orders and every other seller-owned
-- Shop table in this codebase.
drop policy if exists "shop_shipping_options_owner_select" on public.shop_shipping_options;
create policy "shop_shipping_options_owner_select" on public.shop_shipping_options
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = shop_shipping_options.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "shop_shipping_options_owner_write" on public.shop_shipping_options;
create policy "shop_shipping_options_owner_write" on public.shop_shipping_options
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = shop_shipping_options.project_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.projects p
      where p.id = shop_shipping_options.project_id and p.owner_id = auth.uid()
    )
  );

create or replace function public.shop_shipping_options_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists shop_shipping_options_set_updated_at on public.shop_shipping_options;
create trigger shop_shipping_options_set_updated_at
  before update on public.shop_shipping_options
  for each row execute function public.shop_shipping_options_touch_updated_at();

-- Record which option a paid order actually used, and at what price — the
-- price is copied at order time so a later edit to the option never rewrites
-- the history of what a past buyer was actually charged.
alter table public.shop_orders
  add column if not exists shipping_option_id uuid references public.shop_shipping_options(id) on delete set null,
  add column if not exists shipping_option_label text;
