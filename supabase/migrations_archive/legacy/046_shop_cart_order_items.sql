-- Multi-line shop orders (cart checkout) + cart drafts for recovery.
-- Apply after 045.

create table if not exists public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  product_id uuid references public.project_products(id) on delete set null,
  product_name text not null check (char_length(trim(product_name)) between 1 and 120),
  product_upc text,
  product_sku text,
  price_label text not null default '' check (char_length(price_label) <= 60),
  price_xof integer check (price_xof is null or price_xof >= 0),
  quantity integer not null default 1 check (quantity between 1 and 20),
  line_amount_xof integer check (line_amount_xof is null or line_amount_xof >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists shop_order_items_order_idx
  on public.shop_order_items (order_id, sort_order);

create index if not exists shop_order_items_project_idx
  on public.shop_order_items (project_id);

alter table public.shop_order_items enable row level security;

drop policy if exists "Owners read shop_order_items" on public.shop_order_items;
create policy "Owners read shop_order_items"
  on public.shop_order_items for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_order_items.project_id and p.owner_id = auth.uid()
    )
  );

-- Abandoned / in-progress carts (email optional until checkout).
create table if not exists public.shop_cart_drafts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subdomain text not null,
  session_key text not null,
  customer_email text,
  customer_name text,
  customer_phone text,
  items jsonb not null default '[]'::jsonb,
  discount_code text,
  status text not null default 'open'
    check (status in ('open', 'recovered', 'converted', 'expired')),
  last_seen_at timestamptz not null default now(),
  converted_order_id uuid references public.shop_orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, session_key)
);

create index if not exists shop_cart_drafts_project_status_idx
  on public.shop_cart_drafts (project_id, status, last_seen_at desc);

alter table public.shop_cart_drafts enable row level security;

drop policy if exists "Owners read shop_cart_drafts" on public.shop_cart_drafts;
create policy "Owners read shop_cart_drafts"
  on public.shop_cart_drafts for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_cart_drafts.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners update shop_cart_drafts" on public.shop_cart_drafts;
create policy "Owners update shop_cart_drafts"
  on public.shop_cart_drafts for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_cart_drafts.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = shop_cart_drafts.project_id and p.owner_id = auth.uid()
    )
  );

drop trigger if exists shop_cart_drafts_set_updated_at on public.shop_cart_drafts;
create trigger shop_cart_drafts_set_updated_at
  before update on public.shop_cart_drafts
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
