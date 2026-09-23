-- Shop refunds: durable refund records, atomic RPC pair, total-cap constraint.

-- ─── 1. shop_refunds table ────────────────────────────────────────────────────

create table if not exists public.shop_refunds (
  id                        uuid primary key default gen_random_uuid(),
  order_id                  uuid not null references public.shop_orders(id) on delete restrict,
  project_id                uuid not null references public.projects(id) on delete cascade,
  provider                  text not null,
  provider_capture_reference text,
  idempotency_key           text not null,
  requested_amount_xof      integer not null check (requested_amount_xof > 0),
  currency                  text not null default 'XOF',
  status                    text not null default 'pending'
                              check (status in ('pending','processing','succeeded','failed','reconciling')),
  provider_refund_id        text,
  failure_reason            text,
  attempts                  integer not null default 0,
  max_attempts              integer not null default 5,
  restock_status            text not null default 'pending'
                              check (restock_status in ('pending','restocked','skipped')),
  meta                      jsonb not null default '{}'::jsonb,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  completed_at              timestamptz,
  unique (idempotency_key)
);

create index if not exists shop_refunds_order_idx   on public.shop_refunds (order_id);
create index if not exists shop_refunds_status_idx  on public.shop_refunds (status, created_at);
create index if not exists shop_refunds_project_idx on public.shop_refunds (project_id);

drop trigger if exists shop_refunds_set_updated_at on public.shop_refunds;
create trigger shop_refunds_set_updated_at
  before update on public.shop_refunds
  for each row execute function public.set_updated_at();

alter table public.shop_refunds enable row level security;
revoke all on public.shop_refunds from public, anon, authenticated;
grant all on public.shop_refunds to service_role;

-- Store-owner read access.
drop policy if exists "Owners read shop_refunds" on public.shop_refunds;
create policy "Owners read shop_refunds"
  on public.shop_refunds for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_refunds.project_id and p.owner_id = auth.uid()
    )
  );

-- ─── 2. create_shop_refund ────────────────────────────────────────────────────
-- Validates that the requested amount does not exceed the order's paid total,
-- then inserts the refund row. Idempotent via idempotency_key.

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

  insert into public.shop_refunds(
    order_id, project_id, provider, provider_capture_reference,
    idempotency_key, requested_amount_xof, currency, status
  ) values (
    p_order_id, v_order.project_id,
    v_order.payment_provider,
    v_order.provider_reference,
    p_idempotency_key, p_amount_xof, 'XOF', 'pending'
  )
  returning id into v_existing;

  return query select v_existing, false;
end;
$$;

revoke all on function public.create_shop_refund(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.create_shop_refund(uuid, text, integer)
  to service_role;

-- ─── 3. complete_shop_refund ──────────────────────────────────────────────────
-- Marks a refund as succeeded and writes a durable ledger event.
-- Idempotent: safe to call multiple times for the same refund_id.

create or replace function public.complete_shop_refund(
  p_refund_id        uuid,
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
    jsonb_build_object('refundId', p_refund_id, 'providerRefundId', p_provider_refund_id)
  );

  return query select true, 'succeeded';
end;
$$;

revoke all on function public.complete_shop_refund(uuid, text)
  from public, anon, authenticated;
grant execute on function public.complete_shop_refund(uuid, text)
  to service_role;

notify pgrst, 'reload schema';
