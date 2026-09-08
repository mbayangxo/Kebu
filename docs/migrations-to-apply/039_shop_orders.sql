-- =============================================================================
-- Kebu shop — ONE paste for Supabase SQL Editor → Run once
-- Creates catalog (project_products) if missing, then shop_orders.
-- Safe to re-run. Needs public.projects + public.set_updated_at() already.
-- =============================================================================

-- >>> 022 project_products (catalog)

create table if not exists public.project_products (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  business_id uuid,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  price_label text not null default '' check (char_length(price_label) <= 60),
  image_url text not null default '' check (char_length(image_url) <= 500),
  whatsapp_order_message text not null default '' check (char_length(whatsapp_order_message) <= 300),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional FK to businesses when that table exists
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'businesses'
  ) and not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'project_products'
      and constraint_name = 'project_products_business_id_fkey'
  ) then
    alter table public.project_products
      add constraint project_products_business_id_fkey
      foreign key (business_id) references public.businesses(id) on delete set null;
  end if;
end $$;

create index if not exists project_products_project_idx
  on public.project_products (project_id, sort_order);
create index if not exists project_products_business_idx
  on public.project_products (business_id)
  where business_id is not null;

alter table public.project_products enable row level security;

drop policy if exists "Owners manage project_products" on public.project_products;
create policy "Owners manage project_products"
  on public.project_products for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_products.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_products.project_id and p.owner_id = auth.uid()
    )
  );

drop trigger if exists project_products_set_updated_at on public.project_products;
create trigger project_products_set_updated_at
  before update on public.project_products
  for each row execute function public.set_updated_at();

-- >>> 039 shop_orders

create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  product_id uuid references public.project_products(id) on delete set null,
  product_name text not null check (char_length(trim(product_name)) between 1 and 120),
  price_label text not null default '' check (char_length(price_label) <= 60),
  quantity integer not null default 1 check (quantity between 1 and 20),
  customer_name text not null check (char_length(trim(customer_name)) between 1 and 80),
  customer_phone text not null check (char_length(trim(customer_phone)) between 8 and 24),
  customer_note text not null default '' check (char_length(customer_note) <= 400),
  status text not null default 'pending'
    check (status in ('pending', 'contacted', 'fulfilled', 'cancelled')),
  channel text not null default 'whatsapp'
    check (channel in ('whatsapp')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_orders_project_idx
  on public.shop_orders (project_id, created_at desc);

create index if not exists shop_orders_product_idx
  on public.shop_orders (product_id)
  where product_id is not null;

alter table public.shop_orders enable row level security;

drop policy if exists "Owners read shop_orders" on public.shop_orders;
create policy "Owners read shop_orders"
  on public.shop_orders for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_orders.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners update shop_orders" on public.shop_orders;
create policy "Owners update shop_orders"
  on public.shop_orders for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_orders.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = shop_orders.project_id and p.owner_id = auth.uid()
    )
  );

drop trigger if exists shop_orders_set_updated_at on public.shop_orders;
create trigger shop_orders_set_updated_at
  before update on public.shop_orders
  for each row execute function public.set_updated_at();
