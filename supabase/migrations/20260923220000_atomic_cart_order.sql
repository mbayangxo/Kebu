-- Commerce hardening (Item 2): atomic cart order creation.
--
-- Replaces the current 3-call sequence (insert shop_orders → insert shop_order_items
-- → reserve_multi_shop_checkout) with a single PL/pgSQL function that runs inside
-- one transaction. Any failure — including inventory shortage — rolls back the
-- entire unit, so no orphan orders, leaked reservations, or partial inventory
-- changes can survive a process crash.

create or replace function public.create_cart_order_atomic(
  -- Serialized shop_orders fields (all columns pre-computed in TypeScript).
  p_order       jsonb,
  -- Array of shop_order_items rows (without order_id / project_id — added here).
  p_items       jsonb,
  -- Per-line reservation spec.
  p_lines       public.checkout_reservation_line[],
  -- Passed through to reserve_multi_shop_checkout for discount capacity check.
  p_discount_id uuid    default null,
  -- Reservation TTL in minutes (5–60).
  p_ttl_minutes integer default 20
)
returns table(
  order_id      uuid,
  order_number  text,
  gift_public_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id      uuid;
  v_order_number  text;
  v_gift_public_id text;
  v_project_id    uuid;
  v_reserved      boolean;
begin
  -- ── 1. Validate inputs ──────────────────────────────────────────────────────
  if p_order is null then
    raise exception 'order_data_required';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'items_required';
  end if;
  if p_lines is null or array_length(p_lines, 1) is null then
    raise exception 'lines_required';
  end if;

  v_project_id := (p_order->>'project_id')::uuid;
  if v_project_id is null then
    raise exception 'project_id_required';
  end if;

  -- ── 2. Insert the order header ──────────────────────────────────────────────
  insert into public.shop_orders(
    project_id,
    product_id,
    product_name,
    price_label,
    quantity,
    customer_name,
    customer_phone,
    customer_note,
    payment_preference,
    status,
    channel,
    order_number,
    customer_email,
    customer_user_id,
    product_upc,
    product_sku,
    discount_code,
    discount_percent,
    gift_card_code,
    gift_card_amount_xof,
    amount_xof_before_discount,
    amount_xof,
    buyer_country_code,
    shipping_amount_xof,
    shipping_eta_min_days,
    shipping_eta_max_days,
    shipping_corridor,
    shipping_trust_label,
    shipping_quote_version,
    is_gift,
    recipient_name,
    recipient_phone,
    gift_message
  ) values (
    v_project_id,
    (p_order->>'product_id')::uuid,
    p_order->>'product_name',
    p_order->>'price_label',
    (p_order->>'quantity')::integer,
    p_order->>'customer_name',
    p_order->>'customer_phone',
    p_order->>'customer_note',
    p_order->>'payment_preference',
    coalesce(p_order->>'status', 'pending'),
    coalesce(p_order->>'channel', 'whatsapp'),
    p_order->>'order_number',
    nullif(p_order->>'customer_email', ''),
    (p_order->>'customer_user_id')::uuid,
    nullif(p_order->>'product_upc', ''),
    nullif(p_order->>'product_sku', ''),
    nullif(p_order->>'discount_code', ''),
    (p_order->>'discount_percent')::integer,
    nullif(p_order->>'gift_card_code', ''),
    (p_order->>'gift_card_amount_xof')::integer,
    (p_order->>'amount_xof_before_discount')::integer,
    (p_order->>'amount_xof')::integer,
    nullif(p_order->>'buyer_country_code', ''),
    (p_order->>'shipping_amount_xof')::integer,
    (p_order->>'shipping_eta_min_days')::integer,
    (p_order->>'shipping_eta_max_days')::integer,
    nullif(p_order->>'shipping_corridor', ''),
    nullif(p_order->>'shipping_trust_label', ''),
    nullif(p_order->>'shipping_quote_version', ''),
    coalesce((p_order->>'is_gift')::boolean, false),
    nullif(p_order->>'recipient_name', ''),
    nullif(p_order->>'recipient_phone', ''),
    nullif(p_order->>'gift_message', '')
  )
  returning id, order_number, gift_public_id
    into v_order_id, v_order_number, v_gift_public_id;

  -- ── 3. Insert order items ───────────────────────────────────────────────────
  insert into public.shop_order_items(
    order_id, project_id, product_id, variant_id, variant_name,
    product_name, product_upc, product_sku,
    price_label, price_xof, quantity, line_amount_xof, sort_order
  )
  select
    v_order_id,
    v_project_id,
    (el->>'product_id')::uuid,
    (el->>'variant_id')::uuid,
    nullif(el->>'variant_name', ''),
    el->>'product_name',
    nullif(el->>'product_upc', ''),
    nullif(el->>'product_sku', ''),
    el->>'price_label',
    (el->>'price_xof')::integer,
    (el->>'quantity')::integer,
    (el->>'line_amount_xof')::integer,
    (el->>'sort_order')::integer
  from jsonb_array_elements(p_items) as el;

  -- ── 4. Reserve inventory (all-or-nothing) ──────────────────────────────────
  -- reserve_multi_shop_checkout runs inside this same transaction.
  -- If it returns false, raise an exception to trigger full rollback.
  select public.reserve_multi_shop_checkout(
    v_order_id,
    v_project_id,
    p_lines,
    p_discount_id,
    p_ttl_minutes
  ) into v_reserved;

  if not v_reserved then
    raise exception 'inventory_unavailable'
      using hint = 'One or more items are no longer available in the requested quantity.';
  end if;

  -- ── 5. Return identifiers ───────────────────────────────────────────────────
  return query select v_order_id, v_order_number, v_gift_public_id;
end;
$$;

revoke all on function public.create_cart_order_atomic(
  jsonb, jsonb, public.checkout_reservation_line[], uuid, integer
) from public, anon, authenticated;

grant execute on function public.create_cart_order_atomic(
  jsonb, jsonb, public.checkout_reservation_line[], uuid, integer
) to service_role;
