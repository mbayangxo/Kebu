-- Commerce hardening: multi-line reservations, variant inventory, atomic cancellation,
-- negative-stock guards, fix hardcoded rail in complete_shop_payment.

-- ─── 1. Extend shop_checkout_reservations for multi-line carts ─────────────────

-- Drop the single-order constraint so multiple lines per order are allowed.
alter table public.shop_checkout_reservations
  drop constraint if exists shop_checkout_reservations_order_id_key;

-- Add variant_id so variant inventory is tracked through the reservation lifecycle.
alter table public.shop_checkout_reservations
  add column if not exists variant_id uuid references public.project_product_variants(id) on delete set null;

-- Composite unique: one reservation row per (order, product, variant).
-- Null variant_id is a distinct value slot — use a placeholder UUID for coalesce.
create unique index if not exists shop_checkout_reservations_order_line_uidx
  on public.shop_checkout_reservations(
    order_id,
    product_id,
    coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- ─── 2. Negative-stock guards ──────────────────────────────────────────────────

alter table public.project_products
  add constraint project_products_stock_qty_non_negative
    check (stock_qty is null or stock_qty >= 0)
  not valid;
alter table public.project_products
  validate constraint project_products_stock_qty_non_negative;

-- Variants table may not exist yet in all environments; guard with a DO block.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'project_product_variants'
  ) then
    alter table public.project_product_variants
      add constraint project_product_variants_stock_qty_non_negative
        check (stock_qty is null or stock_qty >= 0)
      not valid;
    alter table public.project_product_variants
      validate constraint project_product_variants_stock_qty_non_negative;
  end if;
end;
$$;

-- ─── 3. reserve_multi_shop_checkout ───────────────────────────────────────────
-- Atomic all-or-nothing reservation for a cart with multiple lines.
-- Each line may target a product or a (product, variant) pair.
-- Acquires FOR UPDATE locks in deterministic order (product_id ASC) to avoid deadlocks.

create type if not exists public.checkout_reservation_line as (
  product_id uuid,
  variant_id uuid,
  quantity   integer
);

create or replace function public.reserve_multi_shop_checkout(
  p_order_id    uuid,
  p_project_id  uuid,
  p_lines       public.checkout_reservation_line[],
  p_discount_id uuid    default null,
  p_ttl_minutes integer default 20
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line        public.checkout_reservation_line;
  v_track       boolean;
  v_stock       integer;
  v_var_track   boolean;
  v_var_stock   integer;
  v_reserved    bigint;
  v_discount    public.shop_discount_codes%rowtype;
  v_disc_res    bigint;
  v_expires_at  timestamptz;
  v_pid         uuid;
begin
  if p_ttl_minutes < 5 or p_ttl_minutes > 60 then return false; end if;
  if p_lines is null or array_length(p_lines, 1) is null or array_length(p_lines, 1) = 0 then
    return false;
  end if;

  v_expires_at := now() + make_interval(mins => p_ttl_minutes);

  -- Acquire product locks in deterministic order to prevent deadlocks.
  -- Build sorted distinct product_id list first.
  for v_pid in
    select distinct (unnest(p_lines)).product_id order by 1
  loop
    perform 1 from public.project_products
      where id = v_pid and project_id = p_project_id for update;
    if not found then return false; end if;
  end loop;

  -- Expire stale active reservations for involved products/discount.
  update public.shop_checkout_reservations
     set status = 'expired', released_at = now()
   where status = 'active' and expires_at <= now()
     and (
       product_id = any(select (unnest(p_lines)).product_id)
       or (p_discount_id is not null and discount_id = p_discount_id)
     );

  -- Validate each line.
  foreach v_line in array p_lines loop
    if v_line.quantity is null or v_line.quantity < 1 then return false; end if;

    select track_stock, stock_qty into v_track, v_stock
      from public.project_products
     where id = v_line.product_id;

    if v_line.variant_id is not null then
      -- Variant exists: check variant-level stock if tracked.
      select
        coalesce(pv.track_stock, pp.track_stock, false),
        pv.stock_qty
      into v_var_track, v_var_stock
        from public.project_product_variants pv
        join public.project_products pp on pp.id = pv.product_id
       where pv.id = v_line.variant_id and pv.product_id = v_line.product_id;
      if not found then return false; end if;

      if v_var_track then
        select coalesce(sum(r.quantity), 0) into v_reserved
          from public.shop_checkout_reservations r
         where r.variant_id = v_line.variant_id
           and r.status = 'active' and r.expires_at > now();
        if coalesce(v_var_stock, 0) - v_reserved < v_line.quantity then
          return false;
        end if;
      end if;
    else
      -- No variant: check product-level stock.
      if coalesce(v_track, false) then
        select coalesce(sum(r.quantity), 0) into v_reserved
          from public.shop_checkout_reservations r
         where r.product_id = v_line.product_id and r.variant_id is null
           and r.status = 'active' and r.expires_at > now();
        if coalesce(v_stock, 0) - v_reserved < v_line.quantity then
          return false;
        end if;
      end if;
    end if;
  end loop;

  -- Validate discount capacity once.
  if p_discount_id is not null then
    select * into v_discount from public.shop_discount_codes
     where id = p_discount_id and project_id = p_project_id for update;
    if not found or not v_discount.is_active
       or (v_discount.starts_at is not null and v_discount.starts_at > now())
       or (v_discount.ends_at   is not null and v_discount.ends_at   < now()) then
      return false;
    end if;
    if v_discount.max_uses is not null then
      select count(*) into v_disc_res
        from public.shop_checkout_reservations
       where discount_id = p_discount_id and status = 'active' and expires_at > now();
      if v_discount.uses_count + v_disc_res >= v_discount.max_uses then return false; end if;
    end if;
  end if;

  -- Insert one reservation row per line.
  foreach v_line in array p_lines loop
    insert into public.shop_checkout_reservations(
      order_id, project_id, product_id, variant_id, quantity, discount_id, expires_at
    ) values (
      p_order_id, p_project_id,
      v_line.product_id, v_line.variant_id,
      v_line.quantity,
      case when p_discount_id is not null and v_line = p_lines[1] then p_discount_id else null end,
      v_expires_at
    );
  end loop;

  return true;
exception when unique_violation then
  return false;
end;
$$;

revoke all on function public.reserve_multi_shop_checkout(uuid,uuid,public.checkout_reservation_line[],uuid,integer)
  from public, anon, authenticated;
grant execute on function public.reserve_multi_shop_checkout(uuid,uuid,public.checkout_reservation_line[],uuid,integer)
  to service_role;

-- ─── 4. Update commit_shop_checkout for multi-line orders ─────────────────────
-- Handles multiple reservation rows per order atomically.

create or replace function public.commit_shop_checkout(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r   public.shop_checkout_reservations%rowtype;
  v_any boolean := false;
  v_pid uuid;
begin
  -- Lock all reservation rows for this order in product_id order (deadlock prevention).
  for r in
    select * from public.shop_checkout_reservations
     where order_id = p_order_id
     order by product_id
     for update
  loop
    v_any := true;

    -- Already committed: idempotent.
    if r.status = 'committed' then continue; end if;

    -- Expired or released: cannot commit.
    if r.status <> 'active' or r.expires_at <= now() then
      if r.status = 'active' then
        update public.shop_checkout_reservations
           set status = 'expired', released_at = now()
         where id = r.id;
      end if;
      return false;
    end if;

    -- Decrement variant stock if applicable.
    if r.variant_id is not null then
      if exists(select 1 from public.project_product_variants
                 where id = r.variant_id and coalesce(track_stock, false)) then
        update public.project_product_variants
           set stock_qty = stock_qty - r.quantity, updated_at = now()
         where id = r.variant_id and coalesce(stock_qty, 0) >= r.quantity;
        if not found then return false; end if;
      end if;
    else
      -- Decrement product stock.
      if exists(select 1 from public.project_products
                 where id = r.product_id and track_stock = true) then
        update public.project_products
           set stock_qty = stock_qty - r.quantity, updated_at = now()
         where id = r.product_id and coalesce(stock_qty, 0) >= r.quantity;
        if not found then return false; end if;
      end if;
    end if;
  end loop;

  if not v_any then return false; end if;

  -- Handle discount on first row that has it (discount applied once per order).
  update public.shop_checkout_reservations
     set status = 'committed', committed_at = now()
   where order_id = p_order_id and status = 'active';

  -- Increment discount use count if any row carried a discount.
  declare
    v_discount_id uuid;
  begin
    select discount_id into v_discount_id
      from public.shop_checkout_reservations
     where order_id = p_order_id and discount_id is not null
     limit 1;

    if v_discount_id is not null then
      update public.shop_discount_codes
         set uses_count = uses_count + 1, updated_at = now()
       where id = v_discount_id and is_active = true
         and (starts_at is null or starts_at <= now())
         and (ends_at   is null or ends_at   >= now())
         and (max_uses  is null or uses_count < max_uses);
      if not found then
        raise exception 'reserved discount unavailable at commit';
      end if;
    end if;
  end;

  return true;
end;
$$;

revoke all on function public.commit_shop_checkout(uuid) from public, anon, authenticated;
grant execute on function public.commit_shop_checkout(uuid) to service_role;

-- ─── 5. Update release_shop_checkout for multi-line orders ────────────────────

create or replace function public.release_shop_checkout(p_order_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  update public.shop_checkout_reservations
     set status = case when expires_at <= now() then 'expired' else 'released' end,
         released_at = now()
   where order_id = p_order_id and status = 'active'
  returning true
  limit 1;
$$;

revoke all on function public.release_shop_checkout(uuid) from public, anon, authenticated;
grant execute on function public.release_shop_checkout(uuid) to service_role;

-- ─── 6. cancel_shop_order — atomic cancellation RPC ───────────────────────────
-- Idempotent: calling twice for the same order is safe.
-- Releases active reservation; does NOT auto-restock (restock handled by refund flow).

create or replace function public.cancel_shop_order(
  p_order_id    uuid,
  p_cancelled_by text default 'system'
)
returns table(ok boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.shop_orders%rowtype;
begin
  select * into v_order
    from public.shop_orders
   where id = p_order_id
   for update;

  if not found then
    return query select false, 'order_not_found';
    return;
  end if;

  -- Already cancelled: idempotent.
  if v_order.status = 'cancelled' then
    return query select true, 'already_cancelled';
    return;
  end if;

  -- Cannot cancel a paid order through this path.
  if v_order.payment_status = 'paid' then
    return query select false, 'order_already_paid';
    return;
  end if;

  -- Release any active reservation rows.
  perform public.release_shop_checkout(p_order_id);

  update public.shop_orders
     set status = 'cancelled',
         payment_status = 'cancelled',
         updated_at = now()
   where id = p_order_id;

  return query select true, 'cancelled';
end;
$$;

revoke all on function public.cancel_shop_order(uuid, text) from public, anon, authenticated;
grant execute on function public.cancel_shop_order(uuid, text) to service_role;

-- ─── 7. Fix hardcoded 'paystack' rail in complete_shop_payment ────────────────

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
begin
  if nullif(btrim(p_reference), '') is null or nullif(btrim(p_provider), '') is null then
    raise exception 'payment reference and provider are required';
  end if;

  select * into v_order
    from public.shop_orders
   where provider_reference = p_reference
     and payment_provider   = p_provider
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
     set payment_status     = 'paid',
         status             = 'contacted',
         provider_payment_id = coalesce(nullif(btrim(p_payment_id), ''), provider_payment_id),
         updated_at         = now()
   where id = v_order.id;

  -- Use p_provider as the rail (was hardcoded 'paystack' — fixed).
  insert into public.shop_payment_ledger_events(
    project_id, order_id, rail, event_type, amount_xof, currency,
    provider, provider_reference, meta
  ) values (
    v_order.project_id, v_order.id,
    p_provider, 'paid',
    v_order.amount_xof, 'XOF',
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
