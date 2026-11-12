-- Complete a provider-confirmed shop payment in one database transaction.
-- The function is service-role only: browser clients can never mark orders paid.

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

  select * into v_order
    from public.shop_orders
   where provider_reference = p_reference
     and payment_provider = p_provider
   for update;

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
         updated_at = now()
   where id = v_order.id;

  insert into public.shop_payment_ledger_events(
    project_id, order_id, rail, event_type, amount_xof, currency,
    provider, provider_reference, meta
  ) values (
    v_order.project_id, v_order.id, 'paystack', 'paid', v_order.amount_xof, 'XOF',
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
