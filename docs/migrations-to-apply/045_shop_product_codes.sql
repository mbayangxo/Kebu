-- Product UPC/SKU + human-readable shop order numbers.
-- Apply after APPLY_SHOP_ORDERS.sql (039–044).

alter table public.project_products
  add column if not exists upc text,
  add column if not exists sku text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'project_products_upc_len'
  ) then
    alter table public.project_products
      add constraint project_products_upc_len
      check (upc is null or char_length(trim(upc)) between 4 and 32);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'project_products_sku_len'
  ) then
    alter table public.project_products
      add constraint project_products_sku_len
      check (sku is null or char_length(trim(sku)) between 1 and 40);
  end if;
end $$;

create unique index if not exists project_products_project_upc_uidx
  on public.project_products (project_id, upc)
  where upc is not null;

create unique index if not exists project_products_project_sku_uidx
  on public.project_products (project_id, sku)
  where sku is not null;

alter table public.shop_orders
  add column if not exists order_number text,
  add column if not exists product_upc text,
  add column if not exists product_sku text;

create unique index if not exists shop_orders_project_order_number_uidx
  on public.shop_orders (project_id, order_number)
  where order_number is not null;

create table if not exists public.shop_order_counters (
  project_id uuid primary key references public.projects(id) on delete cascade,
  next_n integer not null default 1 check (next_n >= 1),
  updated_at timestamptz not null default now()
);

alter table public.shop_order_counters enable row level security;

drop policy if exists "Owners read shop_order_counters" on public.shop_order_counters;
create policy "Owners read shop_order_counters"
  on public.shop_order_counters for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_order_counters.project_id and p.owner_id = auth.uid()
    )
  );

-- Service role allocates counters on public place-order; owners may not insert.
-- No insert/update policies for authenticated — allocation via service client only.

notify pgrst, 'reload schema';
