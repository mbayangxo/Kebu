-- Close a real race condition: unlike Paystack/Wave (which already route through
-- complete_shop_payment's FOR UPDATE row lock + idempotency guard), the JOKO webhook path
-- (lib/shop/joko-order.ts markShopOrderPaid) did a plain check-then-update with no row
-- lock — two concurrent webhook deliveries for the same payment could both pass the
-- "not yet paid" read before either wrote, double-committing stock and double-inserting
-- a ledger 'paid' event for the same payment. Fold JOKO into the same atomic, locked path
-- by letting this function also match orders by joko_reference.

create or replace function public.complete_shop_payment(
  p_reference text,
  p_provider text,
  p_payment_id text default null,
  p_expected_order_id uuid default null,
  p_expected_project_id uuid default null,
  p_expected_amount_xof integer default null
)
returns table(order_id uuid, project_id uuid, already_paid boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.shop_orders%rowtype;
  v_committed boolean;
begin
  if nullif(btrim(p_reference), '') is null or nullif(btrim(p_provider), '') is null then
    raise exception 'payment reference and provider are required';
  end if;

  if p_provider = 'joko' then
    select * into v_order
      from public.shop_orders
     where joko_reference = p_reference
     for update;
  else
    select * into v_order
      from public.shop_orders
     where provider_reference = p_reference
       and payment_provider = p_provider
     for update;
  end if;

  if not found then
    return;
  end if;

  if p_expected_order_id is not null and v_order.id <> p_expected_order_id then
    raise exception 'payment order metadata mismatch';
  end if;
  if p_expected_project_id is not null and v_order.project_id <> p_expected_project_id then
    raise exception 'payment project metadata mismatch';
  end if;
  if p_expected_amount_xof is not null and v_order.amount_xof is distinct from p_expected_amount_xof then
    raise exception 'payment amount metadata mismatch';
  end if;

  if v_order.payment_status = 'paid' then
    return query select v_order.id, v_order.project_id, true;
    return;
  end if;

  v_committed := public.commit_shop_checkout(v_order.id);
  if v_committed is distinct from true then
    raise exception 'checkout reservation expired or could not be committed';
  end if;

  update public.shop_orders
     set payment_status = 'paid',
         status = 'contacted',
         provider_payment_id = coalesce(nullif(btrim(p_payment_id), ''), provider_payment_id),
         joko_payment_id = case when p_provider = 'joko'
           then coalesce(nullif(btrim(p_payment_id), ''), joko_payment_id)
           else joko_payment_id end,
         payment_provider = coalesce(payment_provider, p_provider),
         updated_at = now()
   where id = v_order.id;

  insert into public.shop_payment_ledger_events(
    project_id, order_id, rail, event_type, amount_xof, currency,
    provider, provider_reference, meta
  ) values (
    v_order.project_id, v_order.id,
    case when p_provider in ('wave','paypal','joko','orange_money','paystack') then p_provider
         when p_provider = 'card' then 'paystack'
         else 'unknown' end,
    'paid', v_order.amount_xof, case when p_provider = 'joko' then 'CAURIS' else 'XOF' end,
    p_provider, p_reference,
    jsonb_build_object('paymentId', p_payment_id)
  );

  return query select v_order.id, v_order.project_id, false;
end;
$$;

revoke all on function public.complete_shop_payment(text,text,text,uuid,uuid,integer)
  from public, anon, authenticated;
grant execute on function public.complete_shop_payment(text,text,text,uuid,uuid,integer)
  to service_role;

notify pgrst, 'reload schema';
