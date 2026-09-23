-- Converge provider-confirmed shop payments on one atomic database boundary.
-- Extends complete_shop_payment to support Joko's legacy reference column while
-- keeping provider identity, stock commit, order state, and terminal ledger event
-- in the same transaction.

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
  v_provider text := lower(btrim(p_provider));
  v_reference text := btrim(p_reference);
  v_rail text;
  v_currency text;
begin
  if nullif(v_reference, '') is null or nullif(v_provider, '') is null then
    raise exception 'payment reference and provider are required';
  end if;

  select * into v_order
    from public.shop_orders
   where payment_provider = v_provider
     and (
       provider_reference = v_reference
       or (v_provider = 'joko' and joko_reference = v_reference)
     )
   for update;

  if not found and v_provider = 'joko' then
    select * into v_order
      from public.shop_orders
     where joko_reference = v_reference
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
         payment_provider = v_provider,
         provider_reference = coalesce(provider_reference, v_reference),
         provider_payment_id = coalesce(nullif(btrim(p_payment_id), ''), provider_payment_id),
         joko_payment_id = case
           when v_provider = 'joko'
             then coalesce(nullif(btrim(p_payment_id), ''), joko_payment_id)
           else joko_payment_id
         end,
         updated_at = now()
   where id = v_order.id;

  v_rail := case
    when v_provider in ('joko','wave','paystack','paypal','orange_money') then v_provider
    else 'unknown'
  end;
  v_currency := case when v_provider = 'joko' then 'CAURIS' else 'XOF' end;

  insert into public.shop_payment_ledger_events(
    project_id, order_id, rail, event_type, amount_xof, currency,
    provider, provider_reference, meta
  ) values (
    v_order.project_id, v_order.id, v_rail, 'paid', v_order.amount_xof, v_currency,
    v_provider, v_reference,
    jsonb_build_object('paymentId', p_payment_id)
  )
  on conflict do nothing;

  return query select v_order.id, v_order.project_id, false;
end;
$$;

revoke all on function public.complete_shop_payment(text,text,text,uuid,uuid,integer)
  from public, anon, authenticated;
grant execute on function public.complete_shop_payment(text,text,text,uuid,uuid,integer)
  to service_role;
