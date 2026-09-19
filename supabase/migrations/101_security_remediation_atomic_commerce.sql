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
