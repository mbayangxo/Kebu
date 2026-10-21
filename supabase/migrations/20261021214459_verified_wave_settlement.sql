-- Append-only verified Wave quote/settlement records. No legacy quote is guessed.
create table public.wave_checkout_quotes (
 id uuid primary key default gen_random_uuid(),
 purchase_kind text not null check(purchase_kind in ('shop_order','creative_asset_purchase','aesthetic_purchase')),
 purchase_id uuid not null,
 reference text not null unique check(char_length(reference) between 1 and 255 and reference=btrim(reference)),
 checkout_id text not null unique check(char_length(checkout_id) between 1 and 255 and checkout_id=btrim(checkout_id)),
 source_amount_minor bigint not null check(source_amount_minor between 1 and 9007199254740991),
 source_currency text not null check(source_currency in ('USD','XOF')),
 charge_amount_minor bigint not null check(charge_amount_minor between 1 and 9007199254740991),
 charge_currency text not null check(charge_currency='XOF'),
 created_at timestamptz not null default now()
);
create table public.wave_payment_settlements (
 quote_id uuid primary key references public.wave_checkout_quotes(id) on delete restrict,
 transaction_id text not null unique check(char_length(transaction_id) between 1 and 255 and transaction_id=btrim(transaction_id)),
 event_id text not null unique check(char_length(event_id) between 1 and 255 and event_id=btrim(event_id)),
 receipt jsonb not null,
 created_at timestamptz not null default now()
);
alter table public.wave_checkout_quotes enable row level security;
alter table public.wave_payment_settlements enable row level security;
revoke all on public.wave_checkout_quotes,public.wave_payment_settlements from public,anon,authenticated,service_role;
grant select on public.wave_checkout_quotes,public.wave_payment_settlements to service_role;

-- Consistent receipt-first locking order for both initiation and completion.
create or replace function public.record_wave_checkout_quote(
 p_kind text,p_purchase_id uuid,p_reference text,p_checkout_id text,
 p_source_amount_minor bigint,p_source_currency text,p_charge_amount_minor bigint,p_charge_currency text
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_receipt record; v_quote public.wave_checkout_quotes%rowtype;
begin
 if p_kind='creative_asset_purchase' then
  select id,status,provider,provider_reference,amount_cents::bigint as amount into v_receipt
   from public.creative_asset_library where id=p_purchase_id for update;
  if not found or v_receipt.status<>'pending' or v_receipt.provider is distinct from 'wave'
   or v_receipt.provider_reference is distinct from p_reference or p_source_currency is distinct from 'XOF'
   or v_receipt.amount is distinct from p_source_amount_minor then raise exception 'Wave purchase source mismatch'; end if;
 elsif p_kind='aesthetic_purchase' then
  select id,status,provider,provider_reference,amount_usd_cents::bigint as amount into v_receipt
   from public.aesthetic_library where id=p_purchase_id for update;
  if not found or v_receipt.status<>'pending' or v_receipt.provider is distinct from 'wave'
   or v_receipt.provider_reference is distinct from p_reference or p_source_currency is distinct from 'USD'
   or v_receipt.amount is distinct from p_source_amount_minor then raise exception 'Wave purchase source mismatch'; end if;
 elsif p_kind='shop_order' then
  select id,payment_status as status,amount_xof as amount into v_receipt from public.shop_orders where id=p_purchase_id for update;
  if not found or v_receipt.status not in ('unpaid','awaiting_payment','failed')
   or p_source_currency is distinct from 'XOF' or p_source_amount_minor is null or p_source_amount_minor not between 1 and 2147483647
   or (v_receipt.amount is not null and v_receipt.amount is distinct from p_source_amount_minor)
   then raise exception 'Wave order source mismatch'; end if;
 else raise exception 'Unsupported Wave purchase'; end if;
 if p_charge_currency is distinct from 'XOF' or p_charge_amount_minor is null or p_charge_amount_minor<=0
  or (p_source_currency='XOF' and p_charge_amount_minor is distinct from p_source_amount_minor)
  then raise exception 'Invalid Wave quote'; end if;
 insert into public.wave_checkout_quotes(purchase_kind,purchase_id,reference,checkout_id,source_amount_minor,source_currency,charge_amount_minor,charge_currency)
  values(p_kind,p_purchase_id,p_reference,p_checkout_id,p_source_amount_minor,p_source_currency,p_charge_amount_minor,p_charge_currency)
  on conflict(reference) do nothing;
 select * into v_quote from public.wave_checkout_quotes where reference=p_reference for update;
 if v_quote.purchase_kind is distinct from p_kind or v_quote.purchase_id is distinct from p_purchase_id
  or v_quote.checkout_id is distinct from p_checkout_id or v_quote.source_amount_minor is distinct from p_source_amount_minor
  or v_quote.source_currency is distinct from p_source_currency or v_quote.charge_amount_minor is distinct from p_charge_amount_minor
  or v_quote.charge_currency is distinct from p_charge_currency then raise exception 'Conflicting Wave checkout quote'; end if;
 if p_kind='shop_order' then
  update public.shop_orders set payment_status='awaiting_payment',payment_provider='wave',provider_reference=p_reference,
   provider_payment_id=p_checkout_id,amount_xof=p_source_amount_minor::integer,updated_at=now() where id=p_purchase_id;
 elsif p_kind='creative_asset_purchase' then
  update public.creative_asset_library set provider_payment_id=p_checkout_id where id=p_purchase_id;
 else update public.aesthetic_library set provider_payment_id=p_checkout_id where id=p_purchase_id; end if;
 return jsonb_build_object('quote_id',v_quote.id);
end;
$$;
revoke all on function public.record_wave_checkout_quote(text,uuid,text,text,bigint,text,bigint,text) from public,anon,authenticated;
grant execute on function public.record_wave_checkout_quote(text,uuid,text,text,bigint,text,bigint,text) to service_role;

create or replace function public.complete_verified_wave_payment(
 p_reference text,p_checkout_id text,p_transaction_id text,p_event_id text,p_amount_xof bigint,p_currency text
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_quote public.wave_checkout_quotes%rowtype;
 v_settlement public.wave_payment_settlements%rowtype;
 v_receipt record; v_shop record; v_result jsonb;
begin
 if p_reference is null or p_checkout_id is null or p_transaction_id is null or p_event_id is null
  or char_length(btrim(p_transaction_id)) not between 1 and 255 or p_transaction_id<>btrim(p_transaction_id)
  or char_length(btrim(p_event_id)) not between 1 and 255 or p_event_id<>btrim(p_event_id)
  or p_currency is distinct from 'XOF' or p_amount_xof is null or p_amount_xof<=0 then raise exception 'Incomplete Wave proof'; end if;
 select * into v_quote from public.wave_checkout_quotes where reference=p_reference;
 if not found or v_quote.checkout_id is distinct from p_checkout_id or v_quote.charge_amount_minor is distinct from p_amount_xof
  or v_quote.charge_currency is distinct from p_currency then raise exception 'Wave settlement does not match saved quote'; end if;
 if v_quote.purchase_kind='creative_asset_purchase' then
  select id,status,provider,provider_reference,provider_payment_id,asset_id,amount_cents::bigint as amount into v_receipt
   from public.creative_asset_library where id=v_quote.purchase_id for update;
 elsif v_quote.purchase_kind='aesthetic_purchase' then
  select id,status,provider,provider_reference,provider_payment_id,marketplace_id,amount_usd_cents::bigint as amount into v_receipt
   from public.aesthetic_library where id=v_quote.purchase_id for update;
 else
  select id,payment_status as status,payment_provider as provider,provider_reference,provider_payment_id,project_id,amount_xof as amount into v_receipt
   from public.shop_orders where id=v_quote.purchase_id for update;
 end if;
 if not found or v_receipt.provider is distinct from 'wave' or v_receipt.provider_reference is distinct from p_reference
  or v_receipt.amount is distinct from v_quote.source_amount_minor then raise exception 'Wave receipt source mismatch'; end if;
 perform 1 from public.wave_checkout_quotes where id=v_quote.id for update;
 select * into v_settlement from public.wave_payment_settlements where quote_id=v_quote.id;
 if found then
  if v_settlement.transaction_id is distinct from p_transaction_id
   or v_receipt.status is distinct from (case when v_quote.purchase_kind='shop_order' then 'paid' else 'owned' end)
   then raise exception 'Conflicting or inactive Wave settlement replay'; end if;
  if exists(select 1 from public.wave_payment_settlements where event_id=p_event_id and quote_id<>v_quote.id)
   then raise exception 'Wave event belongs to another checkout'; end if;
  return v_settlement.receipt || jsonb_build_object('already_paid',true);
 end if;
 if v_receipt.status is distinct from (case when v_quote.purchase_kind='shop_order' then 'awaiting_payment' else 'pending' end)
  or v_receipt.provider_payment_id is distinct from p_checkout_id then raise exception 'Wave checkout is not active'; end if;
 insert into public.wave_payment_settlements(quote_id,transaction_id,event_id,receipt) values(v_quote.id,p_transaction_id,p_event_id,'{}');
 if v_quote.purchase_kind='shop_order' then
  select * into v_shop from public.complete_shop_payment(p_reference,'wave',p_transaction_id,v_receipt.id,v_receipt.project_id,p_amount_xof::integer);
  if not found then raise exception 'Wave order could not be completed'; end if;
  v_result:=jsonb_build_object('kind','shop_order','order_id',v_shop.order_id,'project_id',v_shop.project_id,'already_paid',false);
 elsif v_quote.purchase_kind='creative_asset_purchase' then
  if v_receipt.asset_id is null then raise exception 'Purchased asset is unavailable'; end if;
  update public.creative_asset_library set status='owned',provider_payment_id=p_transaction_id where id=v_receipt.id;
  update public.marketplace_creative_assets set acquire_count=acquire_count+1 where id=v_receipt.asset_id;
  if not found then raise exception 'Purchased asset is unavailable'; end if;
  v_result:=jsonb_build_object('kind','creative_asset_purchase','library_id',v_receipt.id,'asset_id',v_receipt.asset_id,'already_paid',false);
 else
  update public.aesthetic_library set status='owned',provider_payment_id=p_transaction_id,updated_at=now() where id=v_receipt.id;
  if v_receipt.marketplace_id is not null then
   update public.marketplace_templates set sales_count=sales_count+1 where id=v_receipt.marketplace_id;
   if not found then raise exception 'Purchased template is unavailable'; end if;
  end if;
  v_result:=jsonb_build_object('kind','aesthetic_purchase','library_id',v_receipt.id,'marketplace_id',v_receipt.marketplace_id,'already_paid',false);
 end if;
 update public.wave_payment_settlements set receipt=v_result where quote_id=v_quote.id;
 return v_result;
end;
$$;
revoke all on function public.complete_verified_wave_payment(text,text,text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.complete_verified_wave_payment(text,text,text,text,bigint,text) to service_role;

-- Retain the stock/reservation transaction and signature; attribute the actual provider rail.
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
    v_order.project_id, v_order.id, case when p_provider in ('wave','paypal','joko','orange_money','paystack') then p_provider when p_provider='card' then 'paystack' else 'unknown' end, 'paid', v_order.amount_xof, 'XOF',
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

-- Refresh discovery of the new service-only RPC signatures after migration commit.
notify pgrst, 'reload schema';
