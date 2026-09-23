-- Live-site shop orders (catalog → WhatsApp handoff). Not a fake paid checkout.

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
