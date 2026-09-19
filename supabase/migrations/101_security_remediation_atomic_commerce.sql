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
