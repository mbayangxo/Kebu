-- Fixes a real concurrency gap left open after the sequential cancel-replay fix
-- (origin/stores-payments-audit 7be9cdbb, already in this branch's history): that
-- fix guards against a *retried* cancel request (one that arrives after the first
-- has already committed) by checking existing.status !== "cancelled" before
-- restoring stock. It does nothing for two cancel requests that arrive genuinely
-- concurrently: both read the order's pre-cancellation status via a plain,
-- unlocked SELECT in app/api/projects/[id]/orders/route.ts and lib/shop/fulfillment.ts,
-- both see "not yet cancelled", both proceed to a blind UPDATE ... SET status =
-- 'cancelled' (no WHERE status <> 'cancelled' guard), and both then satisfy the
-- route's own "result.order.status === cancelled && existing.status !== cancelled"
-- check and call restoreProductStock — restoring stock twice for one cancellation.
-- Reproduced under two independent, real PostgreSQL sessions in
-- tests/shop/orders-cancel-concurrency.native.local.test.ts.
--
-- Fix: do the "is this order already cancelled" check, the status transition, and
-- the stock restoration inside ONE function, holding a row lock (`for update`)
-- across all three steps. Two concurrent callers serialize on that lock — whichever
-- transaction commits first performs the transition and restores stock exactly
-- once; the other, once unblocked, sees status already = 'cancelled' and returns a
-- no-op. Because the status update and every stock-restore update happen inside
-- the same function (one implicit transaction), a failure partway through (e.g. a
-- constraint violation while restoring one of several line items) rolls back the
-- whole thing, including the status change — an order can never end up marked
-- cancelled with stock only partly restored.
--
-- Scope: cancellation + stock restoration only. Does not touch payment_status,
-- refunds (create_shop_refund/complete_shop_refund stay entirely separate), the
-- fulfil/archive/tracking paths in lib/shop/fulfillment.ts, or the unrelated
-- shop_payment_ledger_events uniqueness fix from the same original audit commit.
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
set search_path = public
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

  for v_item in
    select product_id, quantity from public.shop_order_items where order_id = p_order_id
  loop
    v_had_items := true;
    if v_item.product_id is not null and v_item.quantity > 0 then
      update public.project_products
         set stock_qty = coalesce(stock_qty, 0) + v_item.quantity,
             updated_at = now()
       where id = v_item.product_id and track_stock = true;
      v_restored := true;
    end if;
  end loop;

  -- Older orders predating shop_order_items: fall back to the order's own
  -- product_id/quantity, matching the exact fallback the route handler used
  -- before this fix.
  if not v_had_items and v_order.product_id is not null and v_order.quantity > 0 then
    update public.project_products
       set stock_qty = coalesce(stock_qty, 0) + v_order.quantity,
           updated_at = now()
     where id = v_order.product_id and track_stock = true;
    v_restored := true;
  end if;

  return query select true, true, false, v_restored, to_jsonb(v_order);
end;
$$;

revoke all on function public.cancel_shop_order_atomic(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cancel_shop_order_atomic(uuid, uuid) to service_role;
notify pgrst, 'reload schema';
