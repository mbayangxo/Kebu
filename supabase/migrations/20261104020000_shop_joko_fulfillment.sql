-- JOKO Fulfillment: seller opt-in to have Kebu pick up and deliver their
-- orders instead of self-fulfilling, in exchange for a commission.
--
-- Honest scope: this migration (and the code built on it) is the real
-- opt-in + bookkeeping + ops-queue layer only. It does NOT perform, track,
-- or simulate any actual physical pickup or delivery — that is real-world
-- work a Kebu operations team does by hand, outside this application. The
-- `status` column below is a workflow field a human updates as they
-- actually complete each step; nothing here auto-advances it.

-- A shipping option can now be self-fulfilled by the seller (default,
-- unchanged behavior) or handed to Kebu for pickup+delivery. Commission is
-- stored in basis points per option so a seller can offer both a cheap
-- self-fulfilled option and a pricier Joko-fulfilled one side by side.
alter table public.shop_shipping_options
  add column if not exists fulfillment_type text not null default 'self'
    check (fulfillment_type in ('self', 'joko_fulfillment')),
  add column if not exists commission_bps integer
    check (commission_bps is null or (commission_bps >= 0 and commission_bps <= 10000));

comment on column public.shop_shipping_options.commission_bps is
  'Kebu''s cut of the order subtotal (not the shipping fee) for a joko_fulfillment option, in basis points (100 = 1%). Null falls back to the platform default in lib/shop/joko-fulfillment.ts.';

-- One row per order that used a joko_fulfillment shipping option. Separate
-- table, not columns on shop_orders, deliberately: shop_orders already has
-- a real "Owners update shop_orders" RLS policy (migrations_archive/legacy/
-- 039_shop_orders.sql) that lets a seller update their own order rows
-- directly from the client. A plain column here would let a seller flip
-- their own fulfillment status (or their commission amount) by hand. This
-- table has NO insert/update policy for authenticated/anon at all — only
-- service_role (i.e. an admin-gated API route) can ever write it. Sellers
-- get read-only visibility via the select policy below.
create table if not exists public.shop_fulfillment_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.shop_orders(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  shipping_option_id uuid references public.shop_shipping_options(id) on delete set null,
  commission_xof integer not null check (commission_xof >= 0),
  status text not null default 'awaiting_pickup'
    check (status in ('awaiting_pickup', 'picked_up', 'in_transit', 'delivered', 'cancelled')),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists shop_fulfillment_orders_project_idx
  on public.shop_fulfillment_orders (project_id, created_at desc);

create index if not exists shop_fulfillment_orders_status_idx
  on public.shop_fulfillment_orders (status, created_at)
  where status in ('awaiting_pickup', 'picked_up', 'in_transit');

alter table public.shop_fulfillment_orders enable row level security;

drop policy if exists "Owners read shop_fulfillment_orders" on public.shop_fulfillment_orders;
create policy "Owners read shop_fulfillment_orders"
  on public.shop_fulfillment_orders for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_fulfillment_orders.project_id and p.owner_id = auth.uid()
    )
  );

-- No insert/update/delete policy for authenticated/anon anywhere above —
-- this is intentional, not an oversight. Only service_role can write.
revoke all on public.shop_fulfillment_orders from public, anon, authenticated;
grant select on public.shop_fulfillment_orders to authenticated;
grant all on public.shop_fulfillment_orders to service_role;

create or replace function public.shop_fulfillment_orders_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists shop_fulfillment_orders_set_updated_at on public.shop_fulfillment_orders;
create trigger shop_fulfillment_orders_set_updated_at
  before update on public.shop_fulfillment_orders
  for each row execute function public.shop_fulfillment_orders_touch_updated_at();

-- Total outstanding Joko Fulfillment commission for a project — the amount
-- that must be subtracted from gross collected revenue before computing what
-- the seller is actually owed. "Outstanding" here means not yet reversed by
-- a cancellation; delivered/in-flight commissions still count because the
-- order was still paid for and fulfilled (or is being fulfilled) by Kebu.
--
-- Integration note for whoever merges this with feature-shop-checkout-security:
-- that branch's shop_seller_balance(p_project_id) currently returns
-- collected_xof as the full sum of 'paid' ledger events with no commission
-- deduction. Once both branches are merged, shop_seller_balance's
-- `collected` CTE needs one change: subtract
-- public.shop_fulfillment_commission_total(p_project_id) from its total
-- before returning available_xof. That function is intentionally written
-- now, on this branch, so the change on merge is a one-line arithmetic edit,
-- not a redesign.
create or replace function public.shop_fulfillment_commission_total(p_project_id uuid)
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(sum(commission_xof), 0)::bigint
  from public.shop_fulfillment_orders
  where project_id = p_project_id
    and status <> 'cancelled';
$$;

revoke all on function public.shop_fulfillment_commission_total(uuid) from public, anon, authenticated;
grant execute on function public.shop_fulfillment_commission_total(uuid) to service_role, authenticated;

notify pgrst, 'reload schema';
