create or replace function public.decrement_shop_cart_stock_atomic(p_lines jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $stock$
declare line jsonb; item record; product public.project_products%rowtype;
begin
  if jsonb_typeof(p_lines) is distinct from 'array' then
    return jsonb_build_object('ok',false,'error','Invalid cart stock request.');
  end if;
  if jsonb_array_length(p_lines) not between 1 and 100 then
    return jsonb_build_object('ok',false,'error','Invalid cart stock request.');
  end if;
  for line in select value from jsonb_array_elements(p_lines) loop
    if jsonb_typeof(line->'product_id') is distinct from 'string'
       or jsonb_typeof(line->'quantity') is distinct from 'number' then
      return jsonb_build_object('ok',false,'error','Invalid quantity or product.');
    end if;
    if (line->>'quantity')::numeric not between 1 and 2147483647
       or (line->>'quantity')::numeric <> floor((line->>'quantity')::numeric) then
      return jsonb_build_object('ok',false,'error','Invalid quantity.');
    end if;
    perform (line->>'product_id')::uuid;
  end loop;
  -- Lock/check every aggregate before any decrement; shared lock order avoids deadlocks.
  for item in select (value->>'product_id')::uuid as id, sum((value->>'quantity')::bigint) as quantity
              from jsonb_array_elements(p_lines) group by 1 order by 1 loop
    select * into product from public.project_products where id=item.id for update;
    if not found then return jsonb_build_object('ok',false,'error','Product not found for stock.'); end if;
    if item.quantity > 2147483647 then return jsonb_build_object('ok',false,'error','Invalid quantity.'); end if;
    if product.track_stock and coalesce(product.stock_qty,0) < item.quantity then
      return jsonb_build_object('ok',false,'error','Not enough stock for that product.');
    end if;
  end loop;
  for item in select (value->>'product_id')::uuid as id, sum((value->>'quantity')::bigint) as quantity
              from jsonb_array_elements(p_lines) group by 1 order by 1 loop
    update public.project_products set stock_qty=stock_qty-item.quantity::integer, updated_at=now()
      where id=item.id and track_stock=true;
  end loop;
  return jsonb_build_object('ok',true);
end $stock$;

create or replace function public.decrement_shop_stock_atomic(p_product_id uuid,p_quantity integer)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $stock$
declare result jsonb; remaining integer;
begin
  result:=public.decrement_shop_cart_stock_atomic(jsonb_build_array(jsonb_build_object('product_id',p_product_id,'quantity',p_quantity)));
  if not (result->>'ok')::boolean then return result; end if;
  select case when track_stock then stock_qty else null end into remaining from public.project_products where id=p_product_id;
  return result || jsonb_build_object('remaining',remaining);
end $stock$;

create or replace function public.restore_shop_stock_atomic(p_product_id uuid,p_quantity integer)
returns void language plpgsql security definer set search_path = public, pg_temp as $stock$
declare product public.project_products%rowtype;
begin
  if p_quantity is null or p_quantity < 1 then raise exception 'Invalid stock restoration quantity' using errcode='22023'; end if;
  select * into product from public.project_products where id=p_product_id for update;
  if not found then raise exception 'Stock restoration product not found' using errcode='22023'; end if;
  if product.track_stock then
    update public.project_products set stock_qty=coalesce(stock_qty,0)+p_quantity,updated_at=now() where id=p_product_id;
  end if;
end $stock$;

revoke all on function public.decrement_shop_cart_stock_atomic(jsonb), public.decrement_shop_stock_atomic(uuid,integer), public.restore_shop_stock_atomic(uuid,integer) from public,anon,authenticated;
grant execute on function public.decrement_shop_cart_stock_atomic(jsonb), public.decrement_shop_stock_atomic(uuid,integer), public.restore_shop_stock_atomic(uuid,integer) to service_role;
notify pgrst, 'reload schema';
