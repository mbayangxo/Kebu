-- Security remediation: atomic commerce and worker primitives.
-- Apply through the normal Supabase migration pipeline before deploying code that calls these RPCs.

create unique index if not exists shop_digital_downloads_order_product_uidx
  on public.shop_digital_downloads (order_id, product_id);

create or replace function public.decrement_product_stock_atomic(
  p_product_id uuid,
  p_quantity integer
)
returns table(ok boolean, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_track boolean;
  v_remaining integer;
begin
  if p_quantity is null or p_quantity < 1 then
    return query select false, null::integer;
    return;
  end if;

  select track_stock into v_track
  from public.project_products
  where id = p_product_id
  for update;

  if not found then
    return query select false, null::integer;
    return;
  end if;

  if not coalesce(v_track, false) then
    return query select true, null::integer;
    return;
  end if;

  update public.project_products
     set stock_qty = stock_qty - p_quantity,
         updated_at = now()
   where id = p_product_id
     and track_stock = true
     and coalesce(stock_qty, 0) >= p_quantity
  returning stock_qty into v_remaining;

  if not found then
    return query select false, null::integer;
    return;
  end if;

  return query select true, v_remaining;
end;
$$;

revoke all on function public.decrement_product_stock_atomic(uuid, integer) from public, anon, authenticated;
grant execute on function public.decrement_product_stock_atomic(uuid, integer) to service_role;

create or replace function public.restore_product_stock_atomic(
  p_product_id uuid,
  p_quantity integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_quantity is null or p_quantity < 1 then return; end if;
  update public.project_products
     set stock_qty = coalesce(stock_qty, 0) + p_quantity,
         updated_at = now()
   where id = p_product_id and track_stock = true;
end;
$$;

revoke all on function public.restore_product_stock_atomic(uuid, integer) from public, anon, authenticated;
grant execute on function public.restore_product_stock_atomic(uuid, integer) to service_role;

create or replace function public.consume_digital_download(
  p_token text
)
returns table(
  id uuid,
  order_id uuid,
  project_id uuid,
  product_id uuid,
  file_path text,
  file_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.shop_digital_downloads d
     set download_count = d.download_count + 1
    from public.shop_orders o
   where d.token = p_token
     and o.id = d.order_id
     and o.payment_status = 'paid'
     and d.expires_at > now()
     and d.download_count < d.max_downloads
  returning d.id, d.order_id, d.project_id, d.product_id, d.file_path, d.file_name;
end;
$$;

revoke all on function public.consume_digital_download(text) from public, anon, authenticated;
grant execute on function public.consume_digital_download(text) to service_role;


create or replace function public.increment_discount_use_atomic(
  p_discount_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  update public.shop_discount_codes
     set uses_count = uses_count + 1,
         updated_at = now()
   where id = p_discount_id
     and is_active = true
     and (starts_at is null or starts_at <= now())
     and (ends_at is null or ends_at >= now())
     and (max_uses is null or uses_count < max_uses)
  returning id into v_id;
  return v_id is not null;
end;
$$;

revoke all on function public.increment_discount_use_atomic(uuid) from public, anon, authenticated;
grant execute on function public.increment_discount_use_atomic(uuid) to service_role;

alter table public.email_flow_enrollments
  add column if not exists processing_token uuid,
  add column if not exists processing_started_at timestamptz;

create or replace function public.claim_due_email_flow_enrollments(
  p_limit integer default 200
)
returns setof public.email_flow_enrollments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid := gen_random_uuid();
begin
  return query
  with candidates as (
    select e.id
      from public.email_flow_enrollments e
     where e.status = 'active'
       and e.next_step_at <= now()
       and (e.processing_started_at is null or e.processing_started_at < now() - interval '15 minutes')
     order by e.next_step_at asc
     for update skip locked
     limit least(greatest(p_limit, 1), 200)
  )
  update public.email_flow_enrollments e
     set processing_token = v_token,
         processing_started_at = now()
    from candidates c
   where e.id = c.id
  returning e.*;
end;
$$;

revoke all on function public.claim_due_email_flow_enrollments(integer) from public, anon, authenticated;
grant execute on function public.claim_due_email_flow_enrollments(integer) to service_role;


-- Checkout reservations keep scarce stock/discount capacity from being permanently
-- consumed by abandoned unpaid orders. Expired reservations stop counting immediately.
create table if not exists public.shop_checkout_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders(id) on delete cascade,
  project_id uuid not null,
  product_id uuid not null references public.project_products(id),
  quantity integer not null check (quantity > 0),
  discount_id uuid references public.shop_discount_codes(id),
  status text not null default 'active' check (status in ('active','committed','released','expired')),
  expires_at timestamptz not null,
  committed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  unique(order_id)
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

  insert into public.shop_checkout_reservations(order_id,project_id,product_id,quantity,discount_id,expires_at)
  values(p_order_id,p_project_id,p_product_id,p_quantity,p_discount_id,now()+make_interval(mins=>p_ttl_minutes));
  return true;
exception when unique_violation then
  return false;
end;
$$;
revoke all on function public.reserve_shop_checkout(uuid,uuid,uuid,integer,uuid,integer) from public,anon,authenticated;
grant execute on function public.reserve_shop_checkout(uuid,uuid,uuid,integer,uuid,integer) to service_role;

create or replace function public.commit_shop_checkout(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare r public.shop_checkout_reservations%rowtype;
begin
  select * into r from public.shop_checkout_reservations where order_id=p_order_id for update;
  if not found then return false; end if;
  if r.status='committed' then return true; end if;
  if r.status<>'active' or r.expires_at<=now() then
    if r.status='active' then update public.shop_checkout_reservations set status='expired',released_at=now() where id=r.id; end if;
    return false;
  end if;

  if exists(select 1 from public.project_products where id=r.product_id and track_stock=true) then
    update public.project_products set stock_qty=stock_qty-r.quantity,updated_at=now()
     where id=r.product_id and coalesce(stock_qty,0)>=r.quantity;
    if not found then return false; end if;
  end if;

  if r.discount_id is not null then
    update public.shop_discount_codes set uses_count=uses_count+1,updated_at=now()
     where id=r.discount_id and is_active=true
       and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>=now())
       and (max_uses is null or uses_count<max_uses);
    if not found then raise exception 'reserved discount unavailable at commit'; end if;
  end if;

  update public.shop_checkout_reservations
     set status='committed',committed_at=now()
   where id=r.id;
  return true;
end;
$$;
revoke all on function public.commit_shop_checkout(uuid) from public,anon,authenticated;
grant execute on function public.commit_shop_checkout(uuid) to service_role;

create or replace function public.release_shop_checkout(p_order_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  update public.shop_checkout_reservations
     set status=case when expires_at<=now() then 'expired' else 'released' end,
         released_at=now()
   where order_id=p_order_id and status='active'
  returning true;
$$;
revoke all on function public.release_shop_checkout(uuid) from public,anon,authenticated;
grant execute on function public.release_shop_checkout(uuid) to service_role;
