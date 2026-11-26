-- Shopper accounts: link orders to Kebu auth users + per-site customer profile.
-- Apply after APPLY_SHOP_ORDERS.sql (039–047).

alter table public.shop_orders
  add column if not exists customer_user_id uuid references auth.users(id) on delete set null;

create index if not exists shop_orders_customer_user_idx
  on public.shop_orders (project_id, customer_user_id, created_at desc)
  where customer_user_id is not null;

-- Customer can read their own orders (never write paid status from browser).
drop policy if exists "Customers read own shop_orders" on public.shop_orders;
create policy "Customers read own shop_orders"
  on public.shop_orders for select
  using (customer_user_id = auth.uid());

drop policy if exists "Customers read own shop_order_items" on public.shop_order_items;
create policy "Customers read own shop_order_items"
  on public.shop_order_items for select
  using (
    exists (
      select 1 from public.shop_orders o
      where o.id = shop_order_items.order_id
        and o.customer_user_id = auth.uid()
    )
  );

-- Optional display profile per shop (one Kebu account can shop many stores).
create table if not exists public.shop_customer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  phone text not null default '' check (char_length(phone) <= 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, project_id)
);

create index if not exists shop_customer_profiles_user_idx
  on public.shop_customer_profiles (user_id);

create index if not exists shop_customer_profiles_project_idx
  on public.shop_customer_profiles (project_id);

alter table public.shop_customer_profiles enable row level security;

drop policy if exists "Customers manage own shop profiles" on public.shop_customer_profiles;
create policy "Customers manage own shop profiles"
  on public.shop_customer_profiles for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Owners read shop customer profiles" on public.shop_customer_profiles;
create policy "Owners read shop customer profiles"
  on public.shop_customer_profiles for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_customer_profiles.project_id and p.owner_id = auth.uid()
    )
  );

drop trigger if exists shop_customer_profiles_set_updated_at on public.shop_customer_profiles;
create trigger shop_customer_profiles_set_updated_at
  before update on public.shop_customer_profiles
  for each row execute function public.set_updated_at();

-- Attach user id on open cart drafts when shopper is signed in (service role writes).
alter table public.shop_cart_drafts
  add column if not exists customer_user_id uuid references auth.users(id) on delete set null;

create index if not exists shop_cart_drafts_user_idx
  on public.shop_cart_drafts (project_id, customer_user_id)
  where customer_user_id is not null;

notify pgrst, 'reload schema';
