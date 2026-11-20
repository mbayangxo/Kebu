-- Reload-safe cart recovery and exact stock reservations. No payment/refund work.
-- Older receipts have no trustworthy reservation snapshot. Preserve their
-- existing cancellation behavior instead of treating absence as untracked stock.
alter table public.shop_cart_order_attempts add column stock_snapshot_version integer not null default 0
  check(stock_snapshot_version in (0,1));
create index shop_cart_order_attempts_order_idx on public.shop_cart_order_attempts(project_id,order_id);

create table public.shop_cart_closed_attempts (
  project_id uuid not null references public.projects(id) on delete cascade,
  attempt_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(project_id,attempt_id)
);
alter table public.shop_cart_closed_attempts enable row level security;
revoke all on public.shop_cart_closed_attempts from public,anon,authenticated;
grant select,insert on public.shop_cart_closed_attempts to service_role;

create table public.shop_cart_stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders(id) on delete cascade deferrable initially deferred,
  project_id uuid not null references public.projects(id) on delete cascade,
  product_id uuid not null,
  variant_id uuid,
  quantity integer not null check(quantity between 1 and 480),
  restored_at timestamptz
);
create unique index shop_cart_product_reservation on public.shop_cart_stock_reservations(order_id,product_id) where variant_id is null;
create unique index shop_cart_variant_reservation on public.shop_cart_stock_reservations(order_id,variant_id) where variant_id is not null;
alter table public.shop_cart_stock_reservations enable row level security;
revoke all on public.shop_cart_stock_reservations from public,anon,authenticated;
grant select,insert,update on public.shop_cart_stock_reservations to service_role;

-- A cart header is a sum of up to 24 lines, each at most 20. Individual order
-- and item validators retain their 20-unit limit.
alter table public.shop_orders drop constraint shop_orders_quantity_check;
alter table public.shop_orders add constraint shop_orders_quantity_check check(quantity between 1 and 480);

create function public.recover_shop_cart_attempt(p_project uuid,p_attempt uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_number text;
begin
  if p_project is null or p_attempt is null then raise exception 'Invalid checkout recovery'; end if;
  perform pg_advisory_xact_lock(hashtextextended('shop-cart:'||p_project::text||':'||p_attempt::text,0));
  select a.order_number into v_number from public.shop_cart_order_attempts a
    where a.project_id=p_project and a.attempt_id=p_attempt;
  if found then return jsonb_build_object('state','saved','order_number',v_number); end if;
  -- Fence a delayed original checkout. Merely reading "not found" would race it.
  insert into public.shop_cart_closed_attempts(project_id,attempt_id) values(p_project,p_attempt) on conflict do nothing;
  return jsonb_build_object('state','closed');
end;
$$;
revoke all on function public.recover_shop_cart_attempt(uuid,uuid) from public,anon,authenticated;
grant execute on function public.recover_shop_cart_attempt(uuid,uuid) to service_role;

create or replace function public.create_shop_cart_atomic(
  p_attempt uuid, p_fingerprint text, p_order jsonb, p_items jsonb,
  p_discount uuid, p_gift_card uuid, p_gift_balance integer, p_commission integer
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_project uuid := (p_order->>'project_id')::uuid;
  v_id uuid := gen_random_uuid();
  v_quantity integer;
  v_stock record;
  v_tracked boolean;
  v_attempt public.shop_cart_order_attempts%rowtype;
  v_order public.shop_orders%rowtype;
  v_result jsonb;
  v_keys text;
  v_columns text;
  v_gift_amount integer := coalesce((p_order->>'gift_card_amount_xof')::integer,0);
begin
  if v_project is null or p_attempt is null or p_fingerprint is null
    or p_fingerprint !~ '^[0-9a-f]{64}$'
    or jsonb_typeof(p_order) is distinct from 'object'
    or jsonb_typeof(p_items) is distinct from 'array'
    or jsonb_array_length(p_items) not between 1 and 24
    or p_order->>'status' is distinct from 'pending'
    or nullif(p_order->>'order_number','') is null then
    raise exception 'Invalid cart checkout';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('shop-cart:' || v_project::text || ':' || p_attempt::text,0));
  select * into v_attempt from public.shop_cart_order_attempts
    where project_id=v_project and attempt_id=p_attempt;
  if found then
    if v_attempt.fingerprint <> p_fingerprint then raise exception using errcode='P4001', message='Checkout details changed'; end if;
    return jsonb_build_object('id',v_attempt.order_id,'order_number',v_attempt.order_number,'replayed',true);
  end if;

  if exists (select 1 from public.shop_cart_closed_attempts where project_id=v_project and attempt_id=p_attempt) then
    raise exception using errcode='P4003', message='Checkout attempt is closed';
  end if;

  if exists (select 1 from jsonb_object_keys(p_order) k where not (k = any(array[
    'project_id','product_id','product_name','price_label','quantity','customer_name','customer_phone','customer_note',
    'payment_preference','status','channel','order_number','is_gift','recipient_name','recipient_phone','gift_message','recipient_email','gift_public_id',
    'customer_email','customer_user_id','product_upc','product_sku','discount_code','discount_percent','affiliate_code','gift_card_code',
    'gift_card_amount_xof','amount_xof_before_discount','amount_xof','buyer_country_code','shipping_option_id','shipping_option_label',
    'shipping_amount_xof','shipping_eta_min_days','shipping_eta_max_days','shipping_corridor','shipping_trust_label','shipping_quote_version'
  ]))) then raise exception 'Unsupported order field'; end if;

  select sum(i.quantity)::integer into v_quantity from jsonb_to_recordset(p_items) i(product_id uuid, quantity integer);
  if v_quantity is distinct from (p_order->>'quantity')::integer or exists (
     select 1 from jsonb_to_recordset(p_items) i(product_id uuid, quantity integer)
     where i.product_id is null or i.quantity is null or i.quantity not between 1 and 20
  ) then raise exception 'Invalid cart items'; end if;

  -- Lock in product order so overlapping carts cannot race on stock.
  for v_stock in
    select i.product_id, sum(i.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) i(product_id uuid, quantity integer)
    group by i.product_id order by i.product_id
  loop
    select p.track_stock into v_tracked from public.project_products p
      where p.project_id=v_project and p.id=v_stock.product_id and p.is_active for update;
    if not found then raise exception using errcode='P4002', message='Product unavailable'; end if;
    if v_tracked then
      insert into public.shop_cart_stock_reservations(order_id,project_id,product_id,quantity)
        values(v_id,v_project,v_stock.product_id,v_stock.quantity);
    end if;
    if not exists (select 1 from public.decrement_product_stock_atomic(v_stock.product_id,v_stock.quantity) s where s.ok)
      then raise exception using errcode='P4002', message='Insufficient stock'; end if;
  end loop;

  -- Every variant must belong to the selected product and store. Product locks
  -- above are always taken first; variant locks use the same deterministic order.
  if exists (
    select 1 from jsonb_to_recordset(p_items) i(product_id uuid,variant_id uuid)
    join public.project_products p on p.id=i.product_id
    where (p.has_variants and i.variant_id is null) or
      (i.variant_id is not null and not exists (
        select 1 from public.project_product_variants v where v.id=i.variant_id
          and v.product_id=i.product_id and v.project_id=v_project and v.is_active
      ))
  ) then raise exception using errcode='P4002', message='Variant unavailable for cart checkout'; end if;
  for v_stock in
    select i.product_id,i.variant_id,sum(i.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) i(product_id uuid,variant_id uuid,quantity integer)
    where i.variant_id is not null group by i.product_id,i.variant_id order by i.product_id,i.variant_id
  loop
    select v.stock_qty is not null into v_tracked from public.project_product_variants v
      where v.id=v_stock.variant_id and v.product_id=v_stock.product_id and v.project_id=v_project and v.is_active for update;
    if not found then raise exception using errcode='P4002', message='Variant unavailable'; end if;
    if v_tracked then
      update public.project_product_variants set stock_qty=stock_qty-v_stock.quantity
        where id=v_stock.variant_id and stock_qty>=v_stock.quantity;
      if not found then raise exception using errcode='P4002', message='Insufficient variant stock'; end if;
      insert into public.shop_cart_stock_reservations(order_id,project_id,product_id,variant_id,quantity)
        values(v_id,v_project,v_stock.product_id,v_stock.variant_id,v_stock.quantity);
    end if;
  end loop;

  if p_discount is not null then
    update public.shop_discount_codes d set uses_count=d.uses_count+1,updated_at=now()
      where d.id=p_discount and d.project_id=v_project and d.is_active
        and d.code=p_order->>'discount_code' and d.percent_off=(p_order->>'discount_percent')::integer
        and (d.starts_at is null or d.starts_at<=now()) and (d.ends_at is null or d.ends_at>=now())
        and (d.max_uses is null or d.uses_count<d.max_uses);
    if not found then
      raise exception using errcode='P4002', message='Discount changed';
    end if;
  end if;
  if v_gift_amount > 0 then
    update public.shop_gift_cards
      set balance_xof=balance_xof-v_gift_amount,
          status=case when balance_xof=v_gift_amount then 'depleted' else 'active' end, updated_at=now()
      where id=p_gift_card and project_id=v_project and code=p_order->>'gift_card_code'
        and status='active' and balance_xof=p_gift_balance and balance_xof>=v_gift_amount
        and (expires_at is null or expires_at>now());
    if not found then raise exception using errcode='P4002', message='Gift card changed'; end if;
  end if;

  p_order := p_order || jsonb_build_object('id',v_id);
  if p_commission is not null then
    v_result := public.create_shop_order_with_fulfillment(p_order,p_commission);
  else
    select string_agg(format('%I',k), ',' order by k),string_agg(format('r.%I',k), ',' order by k)
      into v_keys,v_columns from jsonb_object_keys(p_order) k;
    execute format('insert into public.shop_orders (%s) select %s from jsonb_populate_record(null::public.shop_orders,$1) r returning *',v_keys,v_columns)
      into strict v_order using p_order;
    v_result := jsonb_build_object('id',v_order.id,'order_number',v_order.order_number,'gift_public_id',v_order.gift_public_id);
  end if;
  if (v_result->>'id')::uuid is distinct from v_id then raise exception 'Cart order was not saved'; end if;

  insert into public.shop_order_items(order_id,project_id,product_id,variant_id,variant_name,product_name,product_upc,product_sku,
    price_label,price_xof,quantity,line_amount_xof,sort_order)
  select v_id,v_project,i.product_id,i.variant_id,i.variant_name,i.product_name,i.product_upc,i.product_sku,i.price_label,i.price_xof,i.quantity,i.line_amount_xof,i.sort_order
    from jsonb_to_recordset(p_items) i(product_id uuid,variant_id uuid,variant_name text,product_name text,product_upc text,
      product_sku text,price_label text,price_xof integer,quantity integer,line_amount_xof integer,sort_order integer);

  insert into public.shop_cart_order_attempts(project_id,attempt_id,fingerprint,order_id,order_number,stock_snapshot_version)
    values(v_project,p_attempt,p_fingerprint,v_id,p_order->>'order_number',1);
  return v_result || jsonb_build_object('replayed',false);
end;
$$;
revoke all on function public.create_shop_cart_atomic(uuid,text,jsonb,jsonb,uuid,uuid,integer,integer) from public, anon, authenticated;
grant execute on function public.create_shop_cart_atomic(uuid,text,jsonb,jsonb,uuid,uuid,integer,integer) to service_role;

create or replace function public.cancel_shop_order_atomic(
  p_order_id uuid,
  p_project_id uuid
)
returns table(
  ok boolean,
  found boolean,
  already_cancelled boolean,
  restored boolean,
  order_row jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.shop_orders%rowtype;
  v_item record;
  v_restored boolean := false;
  v_had_items boolean := false;
begin
  select * into v_order
    from public.shop_orders
   where id = p_order_id and project_id = p_project_id
   for update;

  if not found then
    return query select false, false, false, false, null::jsonb;
    return;
  end if;

  if v_order.status = 'cancelled' then
    -- Idempotent: an ordinary retry (sequential or the losing side of a real
    -- concurrent race, once unblocked by the row lock above) does nothing.
    return query select true, true, true, false, to_jsonb(v_order);
    return;
  end if;

  update public.shop_orders
     set status = 'cancelled',
         updated_at = now()
   where id = p_order_id
  returning * into v_order;

  if exists(select 1 from public.shop_cart_order_attempts a where a.order_id=p_order_id and a.project_id=p_project_id and a.stock_snapshot_version=1) then
    -- Restore what was actually deducted, even if tracking settings changed.
    -- Cart receipts with no reservations represent untracked stock: no fallback.
    for v_item in
      select * from public.shop_cart_stock_reservations r
        where r.order_id=p_order_id and r.project_id=p_project_id and r.restored_at is null
        order by r.product_id,r.variant_id nulls first for update
    loop
      if v_item.variant_id is null then
        update public.project_products set stock_qty=coalesce(stock_qty,0)+v_item.quantity, updated_at=now()
          where id=v_item.product_id and project_id=p_project_id;
      else
        update public.project_product_variants set stock_qty=coalesce(stock_qty,0)+v_item.quantity
          where id=v_item.variant_id and product_id=v_item.product_id and project_id=p_project_id;
      end if;
      v_restored := v_restored or found;
      update public.shop_cart_stock_reservations set restored_at=now() where id=v_item.id;
    end loop;
  else
  for v_item in
    select product_id, quantity from public.shop_order_items where order_id = p_order_id and project_id = p_project_id order by product_id
  loop
    v_had_items := true;
    if v_item.product_id is not null and v_item.quantity > 0 then
      update public.project_products
         set stock_qty = coalesce(stock_qty, 0) + v_item.quantity,
             updated_at = now()
       where id = v_item.product_id and project_id = p_project_id and track_stock = true;
      v_restored := v_restored or found;
    end if;
  end loop;

  -- Older orders predating shop_order_items: fall back to the order's own
  -- product_id/quantity, matching the exact fallback the route handler used
  -- before this fix.
  if not v_had_items and v_order.product_id is not null and v_order.quantity > 0 then
    update public.project_products
       set stock_qty = coalesce(stock_qty, 0) + v_order.quantity,
           updated_at = now()
     where id = v_order.product_id and project_id = p_project_id and track_stock = true;
    v_restored := v_restored or found;
  end if;
  end if;

  return query select true, true, false, v_restored, to_jsonb(v_order);
end;
$$;

revoke all on function public.cancel_shop_order_atomic(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cancel_shop_order_atomic(uuid, uuid) to service_role;

notify pgrst, 'reload schema';
