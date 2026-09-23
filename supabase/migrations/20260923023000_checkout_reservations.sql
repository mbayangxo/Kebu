-- Promote the checkout reservation primitives from the legacy remediation archive into the active migration chain.
-- Required by complete_shop_payment and the public cart checkout path.

-- Checkout reservations keep scarce stock/discount capacity from being permanently
-- consumed by abandoned unpaid orders. Expired reservations stop counting immediately.
create table if not exists public.shop_checkout_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders(id) on delete cascade,
  project_id uuid not null,
  product_id uuid not null references public.project_products(id),
  quantity integer not null check (quantity > 0),
  discount_id uuid references public.shop_discount_codes(id),
  gift_card_id uuid references public.shop_gift_cards(id),
  gift_card_amount_xof integer check (gift_card_amount_xof is null or gift_card_amount_xof >= 0),
  status text not null default 'active' check (status in ('active','committed','released','expired')),
  expires_at timestamptz not null,
  committed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  unique(order_id, product_id)
);
create index if not exists shop_checkout_reservations_active_product_idx
  on public.shop_checkout_reservations(product_id, expires_at) where status = 'active';
create index if not exists shop_checkout_reservations_active_discount_idx
  on public.shop_checkout_reservations(discount_id, expires_at) where status = 'active' and discount_id is not null;
alter table public.shop_checkout_reservations enable row level security;
revoke all on public.shop_checkout_reservations from public, anon, authenticated;
grant all on public.shop_checkout_reservations to service_role;

create or replace function public.reserve_shop_checkout(
  p_order_id uuid,
  p_project_id uuid,
  p_product_id uuid,
  p_quantity integer,
  p_discount_id uuid default null,
  p_gift_card_id uuid default null,
  p_gift_card_amount_xof integer default null,
  p_ttl_minutes integer default 20
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_track boolean;
  v_stock integer;
  v_reserved bigint;
  v_discount public.shop_discount_codes%rowtype;
  v_discount_reserved bigint;
  v_gift public.shop_gift_cards%rowtype;
  v_gift_reserved bigint;
begin
  if p_quantity is null or p_quantity < 1 then return false; end if;
  if p_ttl_minutes < 5 or p_ttl_minutes > 60 then return false; end if;

  -- Serialize reservations for this product.
  select track_stock, stock_qty into v_track, v_stock
    from public.project_products
   where id = p_product_id and project_id = p_project_id
   for update;
  if not found then return false; end if;

  update public.shop_checkout_reservations
     set status='expired', released_at=now()
   where status='active' and expires_at <= now()
     and (product_id=p_product_id or discount_id=p_discount_id);

  if coalesce(v_track,false) then
    select coalesce(sum(quantity),0) into v_reserved
      from public.shop_checkout_reservations
     where product_id=p_product_id and status='active' and expires_at>now();
    if coalesce(v_stock,0) - v_reserved < p_quantity then return false; end if;
  end if;

  if p_discount_id is not null then
    select * into v_discount from public.shop_discount_codes
     where id=p_discount_id and project_id=p_project_id for update;
    if not found or not v_discount.is_active
       or (v_discount.starts_at is not null and v_discount.starts_at>now())
       or (v_discount.ends_at is not null and v_discount.ends_at<now()) then
      return false;
    end if;
    if v_discount.max_uses is not null then
      select count(*) into v_discount_reserved
        from public.shop_checkout_reservations
       where discount_id=p_discount_id and status='active' and expires_at>now();
      if v_discount.uses_count + v_discount_reserved >= v_discount.max_uses then return false; end if;
    end if;
  end if;

  if p_gift_card_id is not null and coalesce(p_gift_card_amount_xof,0) > 0 then
    select * into v_gift from public.shop_gift_cards where id=p_gift_card_id and project_id=p_project_id for update;
    if not found or v_gift.status<>'active' or (v_gift.expires_at is not null and v_gift.expires_at<now()) then return false; end if;
    select coalesce(sum(gift_card_amount_xof),0) into v_gift_reserved from public.shop_checkout_reservations where gift_card_id=p_gift_card_id and status='active' and expires_at>now();
    if coalesce(v_gift.balance_xof,0)-v_gift_reserved < p_gift_card_amount_xof then return false; end if;
  end if;

  insert into public.shop_checkout_reservations(order_id,project_id,product_id,quantity,discount_id,gift_card_id,gift_card_amount_xof,expires_at)
  values(p_order_id,p_project_id,p_product_id,p_quantity,p_discount_id,p_gift_card_id,p_gift_card_amount_xof,now()+make_interval(mins=>p_ttl_minutes))
  on conflict(order_id,product_id) do update
     set quantity=excluded.quantity,
         discount_id=excluded.discount_id,
         gift_card_id=excluded.gift_card_id,
         gift_card_amount_xof=excluded.gift_card_amount_xof,
         status='active',
         expires_at=excluded.expires_at,
         committed_at=null,
         released_at=null;
  return true;
exception when unique_violation then
  return false;
end;
$$;
revoke all on function public.reserve_shop_checkout(uuid,uuid,uuid,integer,uuid,uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.reserve_shop_checkout(uuid,uuid,uuid,integer,uuid,uuid,integer,integer) to service_role;

create or replace function public.commit_shop_checkout(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.shop_checkout_reservations%rowtype;
  v_count integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_order_id::text, 0));
  if exists(select 1 from public.shop_checkout_reservations where order_id=p_order_id and status='committed') and
     not exists(select 1 from public.shop_checkout_reservations where order_id=p_order_id and status='active') then
    return true;
  end if;
  if exists(select 1 from public.shop_checkout_reservations where order_id=p_order_id and status='active' and expires_at<=now()) then
    update public.shop_checkout_reservations set status='expired',released_at=now()
     where order_id=p_order_id and status='active' and expires_at<=now();
    return false;
  end if;

  for r in select * from public.shop_checkout_reservations where order_id=p_order_id and status='active' order by product_id for update
  loop
    v_count := v_count + 1;
    if exists(select 1 from public.project_products where id=r.product_id and track_stock=true) then
      update public.project_products set stock_qty=stock_qty-r.quantity,updated_at=now()
       where id=r.product_id and coalesce(stock_qty,0)>=r.quantity;
      if not found then raise exception 'reserved stock unavailable at commit'; end if;
    end if;
    if r.gift_card_id is not null and coalesce(r.gift_card_amount_xof,0)>0 then
      update public.shop_gift_cards set balance_xof=balance_xof-r.gift_card_amount_xof, status=case when balance_xof-r.gift_card_amount_xof=0 then 'depleted' else 'active' end, updated_at=now()
       where id=r.gift_card_id and status='active' and balance_xof>=r.gift_card_amount_xof;
      if not found then raise exception 'reserved gift card unavailable at commit'; end if;
    end if;
    if r.discount_id is not null then
      update public.shop_discount_codes set uses_count=uses_count+1,updated_at=now()
       where id=r.discount_id and is_active=true
         and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>=now())
         and (max_uses is null or uses_count<max_uses);
      if not found then raise exception 'reserved discount unavailable at commit'; end if;
    end if;
  end loop;
  if v_count=0 then return false; end if;
  update public.shop_checkout_reservations set status='committed',committed_at=now()
   where order_id=p_order_id and status='active';
  return true;
end;
$$;
revoke all on function public.commit_shop_checkout(uuid) from public,anon,authenticated;
grant execute on function public.commit_shop_checkout(uuid) to service_role;

create or replace function public.release_shop_checkout(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_order_id::text, 0));
  update public.shop_checkout_reservations
     set status=case when expires_at<=now() then 'expired' else 'released' end,
         released_at=now()
   where order_id=p_order_id and status='active';
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;
revoke all on function public.release_shop_checkout(uuid) from public,anon,authenticated;
grant execute on function public.release_shop_checkout(uuid) to service_role;
