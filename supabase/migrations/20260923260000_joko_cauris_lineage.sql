-- Joko Cauris monetary lineage.
--
-- The model: source currency (XOF) → CAURIS (Joko internal settlement unit) →
-- destination currency.  Each ledger event must carry the full conversion record
-- so that refunds and reconciliation use the *original* rate, not a recalculated one.
--
-- amount_xof  : always the XOF face value (column semantics are fixed).
-- currency    : settlement unit ('CAURIS' for Joko, 'XOF' for all others).
-- meta        : full lineage — source, Cauris, rate, rate source, rate timestamp.
--
-- shop_orders gains five Joko lineage columns so the paid/refunded RPCs can
-- include the original conversion without any extra RPC parameters.

-- ─── 1. shop_orders — Joko conversion record ──────────────────────────────────

alter table public.shop_orders
  add column if not exists joko_cauris_amount  numeric,
  add column if not exists joko_xof_per_cauris numeric,
  add column if not exists joko_rate_source    text,
  add column if not exists joko_rate_as_of     text,
  add column if not exists joko_conversion_at  timestamptz;

-- ─── 2. shop_refunds — carry original lineage from the captured payment ────────

alter table public.shop_refunds
  add column if not exists cauris_amount   numeric,
  add column if not exists cauris_rate     numeric,
  add column if not exists cauris_rate_as_of text;

-- ─── 3. create_shop_refund — copy Joko lineage from the order, set currency ───

create or replace function public.create_shop_refund(
  p_order_id          uuid,
  p_idempotency_key   text,
  p_amount_xof        integer
)
returns table(refund_id uuid, already_exists boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order        public.shop_orders%rowtype;
  v_refunded_sum integer;
  v_existing     uuid;
  v_currency     text;
  v_cauris       numeric;
  v_rate         numeric;
  v_rate_as_of   text;
begin
  if p_amount_xof is null or p_amount_xof < 1 then
    raise exception 'refund amount must be positive';
  end if;
  if nullif(btrim(p_idempotency_key), '') is null then
    raise exception 'idempotency_key is required';
  end if;

  -- Idempotent: return existing row.
  select id into v_existing from public.shop_refunds
   where idempotency_key = p_idempotency_key;
  if found then
    return query select v_existing, true;
    return;
  end if;

  select * into v_order from public.shop_orders
   where id = p_order_id for update;
  if not found then raise exception 'order not found'; end if;
  if v_order.payment_status <> 'paid' then
    raise exception 'order is not in paid status';
  end if;

  -- Enforce refund cap: sum of succeeded + pending/processing refunds.
  select coalesce(sum(requested_amount_xof), 0) into v_refunded_sum
    from public.shop_refunds
   where order_id = p_order_id
     and status in ('succeeded', 'pending', 'processing', 'reconciling');

  if v_refunded_sum + p_amount_xof > v_order.amount_xof then
    raise exception 'refund would exceed captured amount';
  end if;

  -- Currency and Cauris lineage: use the original settlement currency/rate from
  -- the order so refund reconciliation never recalculates with a new rate.
  if v_order.payment_provider = 'joko' then
    v_currency   := 'CAURIS';
    -- Scale the partial refund's Cauris amount proportionally to the captured amount.
    -- If full refund: cauris_amount = joko_cauris_amount.
    if v_order.joko_cauris_amount is not null and v_order.amount_xof > 0 then
      v_cauris := round(
        v_order.joko_cauris_amount * p_amount_xof::numeric / v_order.amount_xof::numeric,
        2
      );
    end if;
    v_rate       := v_order.joko_xof_per_cauris;
    v_rate_as_of := v_order.joko_rate_as_of;
  else
    v_currency   := 'XOF';
    v_cauris     := null;
    v_rate       := null;
    v_rate_as_of := null;
  end if;

  insert into public.shop_refunds(
    order_id, project_id, provider, provider_capture_reference,
    idempotency_key, requested_amount_xof, currency, status,
    cauris_amount, cauris_rate, cauris_rate_as_of
  ) values (
    p_order_id, v_order.project_id,
    v_order.payment_provider,
    v_order.provider_reference,
    p_idempotency_key, p_amount_xof, v_currency, 'pending',
    v_cauris, v_rate, v_rate_as_of
  )
  returning id into v_existing;

  return query select v_existing, false;
end;
$$;

revoke all on function public.create_shop_refund(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.create_shop_refund(uuid, text, integer)
  to service_role;

-- ─── 4. complete_shop_refund — include Cauris lineage in the refunded event ───

create or replace function public.complete_shop_refund(
  p_refund_id          uuid,
  p_provider_refund_id text
)
returns table(ok boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_refund public.shop_refunds%rowtype;
begin
  select * into v_refund from public.shop_refunds
   where id = p_refund_id for update;
  if not found then
    return query select false, 'refund_not_found';
    return;
  end if;

  if v_refund.status = 'succeeded' then
    return query select true, 'already_succeeded';
    return;
  end if;

  if v_refund.status = 'failed' then
    return query select false, 'refund_failed';
    return;
  end if;

  update public.shop_refunds
     set status             = 'succeeded',
         provider_refund_id = coalesce(p_provider_refund_id, v_refund.provider_refund_id),
         completed_at       = now(),
         updated_at         = now()
   where id = p_refund_id;

  insert into public.shop_payment_ledger_events(
    project_id, order_id, rail, event_type,
    amount_xof, currency, provider, provider_reference, meta
  ) values (
    v_refund.project_id, v_refund.order_id,
    v_refund.provider, 'refunded',
    v_refund.requested_amount_xof, v_refund.currency,
    v_refund.provider, coalesce(p_provider_refund_id, v_refund.provider_capture_reference),
    jsonb_build_object(
      'refundId',          p_refund_id,
      'providerRefundId',  p_provider_refund_id,
      'caurisAmount',      v_refund.cauris_amount,
      'caurisRate',        v_refund.cauris_rate,
      'caurisRateAsOf',    v_refund.cauris_rate_as_of
    )
  );

  return query select true, 'succeeded';
end;
$$;

revoke all on function public.complete_shop_refund(uuid, text)
  from public, anon, authenticated;
grant execute on function public.complete_shop_refund(uuid, text)
  to service_role;

-- ─── 5. complete_shop_payment — restore CAURIS + full lineage in meta ─────────
-- Migration 20260923200000 accidentally hardcoded 'XOF' for all providers and
-- lost the joko_reference fallback lookup.  This corrects both while keeping
-- the rail fix (use p_provider, not a hardcoded string) from that migration.

create or replace function public.complete_shop_payment(
  p_reference              text,
  p_provider               text,
  p_payment_id             text    default null,
  p_expected_order_id      uuid    default null,
  p_expected_project_id    uuid    default null,
  p_expected_amount_xof    integer default null
)
returns table(order_id uuid, project_id uuid, already_paid boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order     public.shop_orders%rowtype;
  v_committed boolean;
  v_provider  text := lower(btrim(p_provider));
  v_reference text := btrim(p_reference);
  v_rail      text;
  v_currency  text;
begin
  if nullif(v_reference, '') is null or nullif(v_provider, '') is null then
    raise exception 'payment reference and provider are required';
  end if;

  -- Primary lookup: payment_provider + provider_reference.
  select * into v_order
    from public.shop_orders
   where payment_provider = v_provider
     and (
       provider_reference = v_reference
       or (v_provider = 'joko' and joko_reference = v_reference)
     )
   for update;

  -- Joko fallback: legacy rows that only have joko_reference set.
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

  -- Idempotent: already paid.
  if v_order.payment_status = 'paid' then
    return query select v_order.id, v_order.project_id, true;
    return;
  end if;

  v_committed := public.commit_shop_checkout(v_order.id);
  if v_committed is distinct from true then
    raise exception 'checkout reservation expired or could not be committed';
  end if;

  update public.shop_orders
     set payment_status      = 'paid',
         status              = 'contacted',
         payment_provider    = v_provider,
         provider_reference  = coalesce(provider_reference, v_reference),
         provider_payment_id = coalesce(nullif(btrim(p_payment_id), ''), provider_payment_id),
         joko_payment_id     = case
           when v_provider = 'joko'
             then coalesce(nullif(btrim(p_payment_id), ''), joko_payment_id)
           else joko_payment_id
         end,
         updated_at          = now()
   where id = v_order.id;

  v_rail     := case
    when v_provider in ('joko','wave','paystack','paypal','orange_money') then v_provider
    else 'unknown'
  end;
  -- CAURIS for Joko: the amount_xof column always holds XOF; currency labels the
  -- settlement rail.  Full conversion lineage goes in meta so refunds/reconciliation
  -- can use the *original* rate without recalculation.
  v_currency := case when v_provider = 'joko' then 'CAURIS' else 'XOF' end;

  insert into public.shop_payment_ledger_events(
    project_id, order_id, rail, event_type, amount_xof, currency,
    provider, provider_reference, meta
  ) values (
    v_order.project_id, v_order.id,
    v_rail, 'paid',
    v_order.amount_xof, v_currency,
    v_provider, v_reference,
    jsonb_build_object(
      'paymentId',    p_payment_id,
      'caurisAmount', case when v_provider = 'joko' then v_order.joko_cauris_amount else null end,
      'xofPerCauris', case when v_provider = 'joko' then v_order.joko_xof_per_cauris else null end,
      'rateSource',   case when v_provider = 'joko' then v_order.joko_rate_source    else null end,
      'rateAsOf',     case when v_provider = 'joko' then v_order.joko_rate_as_of     else null end,
      'conversionAt', case when v_provider = 'joko' then v_order.joko_conversion_at  else null end
    )
  )
  on conflict do nothing;

  return query select v_order.id, v_order.project_id, false;
end;
$$;

revoke all on function public.complete_shop_payment(text,text,text,uuid,uuid,integer)
  from public, anon, authenticated;
grant execute on function public.complete_shop_payment(text,text,text,uuid,uuid,integer)
  to service_role;

notify pgrst, 'reload schema';
