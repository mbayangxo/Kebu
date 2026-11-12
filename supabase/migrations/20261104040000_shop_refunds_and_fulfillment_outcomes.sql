-- Codex point 4: "cancellation, failed delivery, returns, and refunds also need
-- explicit handling" — none of this existed before this migration. 'refunded' was
-- only a type-level enum value on shop_payment_ledger_events; nothing ever inserted
-- one, and shop_seller_balance() was blind to refunds entirely (it only ever summed
-- 'paid' events, so a refunded order's full gross amount would stay in a seller's
-- payable balance forever). shop_fulfillment_orders only had 'cancelled' to express
-- any non-happy-path outcome, conflating "never shipped" with "delivery attempted
-- and failed" and "delivered, then returned."

-- Real Joko Fulfillment outcomes beyond the three happy-path statuses.
alter table public.shop_fulfillment_orders drop constraint if exists shop_fulfillment_orders_status_check;
alter table public.shop_fulfillment_orders add constraint shop_fulfillment_orders_status_check
  check (status in ('awaiting_pickup', 'picked_up', 'in_transit', 'delivered', 'failed_delivery', 'returned', 'cancelled'));

-- A refunded order is a real, distinct payment state — not just "paid" forever.
alter table public.shop_orders drop constraint if exists shop_orders_payment_status_check;
alter table public.shop_orders add constraint shop_orders_payment_status_check
  check (payment_status is null or payment_status in ('unpaid', 'awaiting_payment', 'paid', 'failed', 'refunded'));

-- Commercial rule, explicit and flagged, not silently chosen (the user's own
-- instruction this consolidation follows throughout): a Joko Fulfillment
-- commission is Kebu's charge for performing the pickup+delivery service.
-- 'cancelled' (never picked up) and 'failed_delivery' (attempted, not completed)
-- mean that service was never rendered, so the commission must not apply.
-- 'returned' means delivery DID succeed — Kebu's service was fully performed —
-- and the customer's later return is a separate transaction between buyer and
-- seller, so the commission still applies here. This is a reasoned default, not
-- a certainty; flag it for the user's explicit confirmation before treating it
-- as final, same as the rest of this migration's commercial rules.
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
    and status not in ('cancelled', 'failed_delivery');
$$;

-- Full-order refunds only (this pass) — not partial refunds, which would need a
-- separate running-total-vs-original-amount reconciliation this slice doesn't
-- build. Admin-only: actually reversing a real payment through a provider (Wave/
-- Paystack/Orange Money/Joko) is a real-world action a Kebu ops person performs
-- by hand with that provider, exactly like a payout — this function is the
-- bookkeeping for a refund that already happened, not something that triggers a
-- live provider API call (no such integration exists for any rail in this
-- codebase; confirmed by reading every payment adapter before writing this).
create or replace function public.record_shop_refund(
  p_order_id uuid,
  p_reason text default null
)
returns table(ok boolean, error text, refunded_xof bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_collected bigint;
  v_already_refunded bigint;
  v_amount bigint;
begin
  select id, project_id, payment_status, amount_xof
    into v_order
    from public.shop_orders
    where id = p_order_id
    for update;

  if v_order.id is null then
    return query select false, 'Order not found.'::text, 0::bigint;
    return;
  end if;
  if v_order.payment_status is distinct from 'paid' then
    return query select false, 'Only a paid order can be refunded.'::text, 0::bigint;
    return;
  end if;

  select coalesce(sum(amount_xof), 0)::bigint into v_collected
    from public.shop_payment_ledger_events
    where order_id = p_order_id and event_type = 'paid';
  select coalesce(sum(amount_xof), 0)::bigint into v_already_refunded
    from public.shop_payment_ledger_events
    where order_id = p_order_id and event_type = 'refunded';

  if v_already_refunded > 0 then
    return query select false, 'This order has already been refunded.'::text, 0::bigint;
    return;
  end if;
  if v_collected <= 0 then
    return query select false, 'No collected payment found for this order.'::text, 0::bigint;
    return;
  end if;
  v_amount := v_collected;

  insert into public.shop_payment_ledger_events (project_id, order_id, rail, event_type, amount_xof, provider, meta)
  select project_id, order_id, rail, 'refunded', v_amount, provider,
         jsonb_build_object('reason', coalesce(p_reason, ''))
  from public.shop_payment_ledger_events
  where order_id = p_order_id and event_type = 'paid'
  order by created_at desc
  limit 1;

  update public.shop_orders set payment_status = 'refunded' where id = p_order_id;

  return query select true, null::text, v_amount;
end;
$$;

revoke all on function public.record_shop_refund(uuid, text) from public, anon, authenticated;
grant execute on function public.record_shop_refund(uuid, text) to service_role;

-- shop_seller_balance now nets refunds out of collected revenue — a refunded
-- order's money can never sit in a seller's payable balance.
drop function if exists public.shop_seller_balance(uuid);

create function public.shop_seller_balance(p_project_id uuid)
returns table(
  collected_xof bigint,
  refunded_xof bigint,
  fulfillment_commission_xof bigint,
  requested_or_paid_xof bigint,
  available_xof bigint
)
language sql
security definer
stable
set search_path = public
as $$
  with paid as (
    select coalesce(sum(amount_xof), 0)::bigint as total
    from public.shop_payment_ledger_events
    where project_id = p_project_id
      and event_type = 'paid'
      and rail = any (public.shop_kebu_controlled_rails())
      and coalesce(currency, 'XOF') = 'XOF'
  ),
  refunded as (
    select coalesce(sum(amount_xof), 0)::bigint as total
    from public.shop_payment_ledger_events
    where project_id = p_project_id
      and event_type = 'refunded'
      and rail = any (public.shop_kebu_controlled_rails())
      and coalesce(currency, 'XOF') = 'XOF'
  ),
  commission as (
    select public.shop_fulfillment_commission_total(p_project_id) as total
  ),
  committed as (
    select coalesce(sum(amount_xof), 0)::bigint as total
    from public.shop_payout_requests
    where project_id = p_project_id
      and status in ('requested', 'processing', 'paid')
  )
  select
    paid.total,
    refunded.total,
    commission.total,
    committed.total,
    greatest(0, paid.total - refunded.total - commission.total - committed.total)
  from paid, refunded, commission, committed;
$$;

revoke all on function public.shop_seller_balance(uuid) from public, anon, authenticated;
grant execute on function public.shop_seller_balance(uuid) to service_role;

notify pgrst, 'reload schema';
