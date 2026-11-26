-- Restores decrement_product_stock_atomic + restore_product_stock_atomic, which
-- lib/shop/stock.ts's decrementProductStock()/restoreProductStock() both call, and
-- which this migration's own sibling (the new order-cancellation fix) depends on.
--
-- These two functions exist for real in the hosted production database (confirmed
-- by a direct, read-only query against pg_proc/pg_get_functiondef on 2026-11-06 —
-- not inferred from table/function absence) but their CREATE FUNCTION statements
-- live only in supabase/migrations_archive/legacy/101_security_remediation_atomic_commerce.sql,
-- which an earlier "reconcile Supabase migration history" cleanup moved out of the
-- active migrations directory without re-adding them. Without this migration, a
-- fresh database built from the active migrations set alone has calls to these
-- functions (checkout reservation, order cancellation, cart-stock rollback) but no
-- function to call — the same class of gap already found and fixed once this
-- session for help_requests/platform_cron_runs. Restored verbatim against the real
-- production function bodies (confirmed byte-for-byte equivalent to the archived
-- source, aside from this comment) — idempotent `create or replace function`, safe
-- whether or not the archived file was already applied directly to a given database.
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
notify pgrst, 'reload schema';
