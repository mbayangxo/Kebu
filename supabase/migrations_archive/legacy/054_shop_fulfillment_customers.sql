-- 054 shop fulfillment + per-store customer profiles
-- Apply after APPLY_SHOP_ORDERS.sql (through 051). Safe to re-run.

-- >>> Fulfillment columns on shop_orders
alter table public.shop_orders
  add column if not exists tracking_number text,
  add column if not exists carrier text,
  add column if not exists tracking_url text,
  add column if not exists fulfilled_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists customer_notified_at timestamptz,
  add column if not exists customer_notify_via text;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'shop_orders_status_check'
  ) then
    alter table public.shop_orders drop constraint shop_orders_status_check;
  end if;
  alter table public.shop_orders
    add constraint shop_orders_status_check
    check (status in ('pending', 'contacted', 'fulfilled', 'cancelled', 'archived'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_carrier_check'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_carrier_check
      check (
        carrier is null
        or carrier in (
          'dhl', 'fedex', 'ups', 'usps', 'chronopost', 'colissimo', 'laposte',
          'dpd', 'gls', 'aramex', 'jt', 'yango', 'local', 'other', 'pickup'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_customer_notify_via_check'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_customer_notify_via_check
      check (
        customer_notify_via is null
        or customer_notify_via in ('email', 'whatsapp', 'both', 'none')
      );
  end if;
end $$;

alter table public.shop_orders
  drop constraint if exists shop_orders_tracking_number_len;
alter table public.shop_orders
  add constraint shop_orders_tracking_number_len
  check (tracking_number is null or char_length(trim(tracking_number)) between 1 and 80);

create index if not exists shop_orders_fulfillment_idx
  on public.shop_orders (project_id, status, created_at desc);

-- >>> Per-store customer profiles (build on every order)
create table if not exists public.shop_customers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  customer_key text not null check (char_length(trim(customer_key)) between 3 and 120),
  name text not null default 'Customer' check (char_length(trim(name)) between 1 and 80),
  phone text check (phone is null or char_length(trim(phone)) between 8 and 24),
  email text check (email is null or email ~* '^[^@]+@[^@]+\.[^@]+$'),
  order_count integer not null default 0 check (order_count >= 0),
  lifetime_amount_xof numeric(14, 2) not null default 0 check (lifetime_amount_xof >= 0),
  average_order_amount_xof numeric(14, 2) not null default 0 check (average_order_amount_xof >= 0),
  liked_products jsonb not null default '[]'::jsonb,
  first_order_at timestamptz,
  last_order_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, customer_key)
);

create index if not exists shop_customers_project_idx
  on public.shop_customers (project_id, last_order_at desc nulls last);

create index if not exists shop_customers_email_idx
  on public.shop_customers (project_id, email)
  where email is not null;

create index if not exists shop_customers_phone_idx
  on public.shop_customers (project_id, phone)
  where phone is not null;

alter table public.shop_customers enable row level security;

drop policy if exists "Owners read shop_customers" on public.shop_customers;
create policy "Owners read shop_customers"
  on public.shop_customers for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_customers.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners write shop_customers" on public.shop_customers;
create policy "Owners write shop_customers"
  on public.shop_customers for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_customers.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = shop_customers.project_id and p.owner_id = auth.uid()
    )
  );

drop trigger if exists shop_customers_set_updated_at on public.shop_customers;
create trigger shop_customers_set_updated_at
  before update on public.shop_customers
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
