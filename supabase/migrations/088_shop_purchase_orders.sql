-- 088_shop_purchase_orders: purchase orders from merchant to suppliers
create table if not exists shop_purchase_orders (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
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

-- line items
create table if not exists shop_purchase_order_items (
  id                  uuid primary key default gen_random_uuid(),
  purchase_order_id   uuid not null references shop_purchase_orders(id) on delete cascade,
  product_name        text not null,
  sku                 text,
  qty_ordered         integer not null default 0,
  qty_received        integer not null default 0,
  unit_cost_xof       numeric(12,2) not null default 0,
  line_total_xof      numeric(12,2) generated always as (qty_ordered * unit_cost_xof) stored,
  created_at          timestamptz not null default now()
);

create index if not exists shop_pos_project_idx  on shop_purchase_orders(project_id);
create index if not exists shop_pos_status_idx   on shop_purchase_orders(project_id, status);
create index if not exists shop_po_items_po_idx  on shop_purchase_order_items(purchase_order_id);

alter table shop_purchase_orders enable row level security;
alter table shop_purchase_order_items enable row level security;

-- RLS: owner/collaborator
create policy "shop_po_select" on shop_purchase_orders
  for select using (
    exists (
      select 1 from projects p
      where p.id = shop_purchase_orders.project_id
        and (p.user_id = auth.uid() or exists (
          select 1 from project_collaborators pc where pc.project_id = p.id and pc.user_id = auth.uid()
        ))
    )
  );

create policy "shop_po_insert" on shop_purchase_orders
  for insert with check (
    exists (
      select 1 from projects p
      where p.id = shop_purchase_orders.project_id
        and (p.user_id = auth.uid() or exists (
          select 1 from project_collaborators pc where pc.project_id = p.id and pc.user_id = auth.uid()
        ))
    )
  );

create policy "shop_po_update" on shop_purchase_orders
  for update using (
    exists (
      select 1 from projects p
      where p.id = shop_purchase_orders.project_id
        and (p.user_id = auth.uid() or exists (
          select 1 from project_collaborators pc where pc.project_id = p.id and pc.user_id = auth.uid()
        ))
    )
  );

create policy "shop_po_delete" on shop_purchase_orders
  for delete using (
    exists (
      select 1 from projects p
      where p.id = shop_purchase_orders.project_id
        and (p.user_id = auth.uid() or exists (
          select 1 from project_collaborators pc where pc.project_id = p.id and pc.user_id = auth.uid()
        ))
    )
  );

-- items inherit PO access
create policy "shop_po_items_select" on shop_purchase_order_items
  for select using (
    exists (
      select 1 from shop_purchase_orders po
      join projects p on p.id = po.project_id
      where po.id = shop_purchase_order_items.purchase_order_id
        and (p.user_id = auth.uid() or exists (
          select 1 from project_collaborators pc where pc.project_id = p.id and pc.user_id = auth.uid()
        ))
    )
  );

create policy "shop_po_items_insert" on shop_purchase_order_items
  for insert with check (
    exists (
      select 1 from shop_purchase_orders po
      join projects p on p.id = po.project_id
      where po.id = shop_purchase_order_items.purchase_order_id
        and (p.user_id = auth.uid() or exists (
          select 1 from project_collaborators pc where pc.project_id = p.id and pc.user_id = auth.uid()
        ))
    )
  );

create policy "shop_po_items_update" on shop_purchase_order_items
  for update using (
    exists (
      select 1 from shop_purchase_orders po
      join projects p on p.id = po.project_id
      where po.id = shop_purchase_order_items.purchase_order_id
        and (p.user_id = auth.uid() or exists (
          select 1 from project_collaborators pc where pc.project_id = p.id and pc.user_id = auth.uid()
        ))
    )
  );

create policy "shop_po_items_delete" on shop_purchase_order_items
  for delete using (
    exists (
      select 1 from shop_purchase_orders po
      join projects p on p.id = po.project_id
      where po.id = shop_purchase_order_items.purchase_order_id
        and (p.user_id = auth.uid() or exists (
          select 1 from project_collaborators pc where pc.project_id = p.id and pc.user_id = auth.uid()
        ))
    )
  );
