-- 088_shop_purchase_orders: purchase orders from merchant to suppliers
create table if not exists public.shop_purchase_orders (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  po_number       text not null,
  supplier_name   text not null,
  supplier_phone  text,
  supplier_email  text,
  status          text not null default 'draft'
                    check (status in ('draft','ordered','partial','received','cancelled')),
  currency        text not null default 'XOF',
  subtotal_xof    numeric(12,2) not null default 0,
  shipping_xof    numeric(12,2) not null default 0,
  total_xof       numeric(12,2) generated always as (subtotal_xof + shipping_xof) stored,
  note            text,
  expected_at     date,
  received_at     date,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.shop_purchase_order_items (
  id                  uuid primary key default gen_random_uuid(),
  purchase_order_id   uuid not null references public.shop_purchase_orders(id) on delete cascade,
  product_name        text not null,
  sku                 text,
  qty_ordered         integer not null default 0,
  qty_received        integer not null default 0,
  unit_cost_xof       numeric(12,2) not null default 0,
  line_total_xof      numeric(12,2) generated always as (qty_ordered * unit_cost_xof) stored,
  created_at          timestamptz not null default now()
);

create index if not exists shop_pos_project_idx  on public.shop_purchase_orders(project_id);
create index if not exists shop_pos_status_idx   on public.shop_purchase_orders(project_id, status);
create index if not exists shop_po_items_po_idx  on public.shop_purchase_order_items(purchase_order_id);

alter table public.shop_purchase_orders enable row level security;
alter table public.shop_purchase_order_items enable row level security;

drop policy if exists "Owners manage shop_purchase_orders" on public.shop_purchase_orders;
create policy "Owners manage shop_purchase_orders"
  on public.shop_purchase_orders for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_purchase_orders.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = shop_purchase_orders.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners manage shop_purchase_order_items" on public.shop_purchase_order_items;
create policy "Owners manage shop_purchase_order_items"
  on public.shop_purchase_order_items for all
  using (
    exists (
      select 1 from public.shop_purchase_orders po
      join public.projects p on p.id = po.project_id
      where po.id = shop_purchase_order_items.purchase_order_id
        and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.shop_purchase_orders po
      join public.projects p on p.id = po.project_id
      where po.id = shop_purchase_order_items.purchase_order_id
        and p.owner_id = auth.uid()
    )
  );
