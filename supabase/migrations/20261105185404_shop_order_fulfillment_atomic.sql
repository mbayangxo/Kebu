-- Source-only; apply to designated QA before releasing the corresponding checkout.
-- An order and its protected fulfillment/commission snapshot commit together.
-- No exception handler: failure of either insert rolls back both, before payment.
create or replace function public.create_shop_order_with_fulfillment(
  p_order jsonb, p_commission_xof integer
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_order public.shop_orders%rowtype;
  v_option public.shop_shipping_options%rowtype;
  v_fulfillment public.shop_fulfillment_orders%rowtype;
  v_columns text;
  v_values text;
  v_id uuid;
begin
  if jsonb_typeof(p_order) is distinct from 'object' or p_commission_xof is null or p_commission_xof < 0 then
    raise exception 'Invalid fulfillment checkout.';
  end if;
  -- Only server-generated checkout fields; quote identifiers as well. Omitted
  -- columns retain their real database defaults, including gift_public_id.
  if exists (select 1 from jsonb_object_keys(p_order) k where k <> all(array[
    'id','project_id','product_id','product_name','price_label','quantity',
    'customer_name','customer_phone','customer_note','payment_preference',
    'status','channel','order_number','is_gift','recipient_name','recipient_phone',
    'gift_message','recipient_email','gift_public_id','customer_email','customer_user_id','product_upc','product_sku',
    'discount_code','discount_percent','affiliate_code','gift_card_code',
    'gift_card_amount_xof','amount_xof_before_discount','amount_xof',
    'buyer_country_code','shipping_option_id','shipping_option_label','shipping_amount_xof'
  ])) then raise exception 'Unsupported checkout field.'; end if;
  v_id := (p_order->>'id')::uuid;
  if v_id is null or p_order->>'project_id' is null or p_order->>'shipping_option_id' is null then
    raise exception 'Fulfillment checkout identity required.';
  end if;
  -- Serializes retries with the SAME checkout id. A fresh cart submission is
  -- still a new order; this does not claim request-wide checkout idempotency.
  perform pg_advisory_xact_lock(hashtextextended('shop-fulfillment:' || v_id::text, 0));
  select * into v_order from public.shop_orders where id = v_id for update;
  if found then
    select * into v_fulfillment from public.shop_fulfillment_orders where order_id = v_id;
    if not found or not (to_jsonb(v_order) @> p_order)
      or v_fulfillment.project_id <> v_order.project_id
      or v_fulfillment.shipping_option_id is distinct from v_order.shipping_option_id
      or v_fulfillment.commission_xof <> p_commission_xof then
      raise exception 'Checkout retry conflicts with existing order; manual reconciliation required.';
    end if;
    -- Never update/reset an existing human-recorded delivery status or note.
  else
    select * into v_option from public.shop_shipping_options
      where id = (p_order->>'shipping_option_id')::uuid
        and project_id = (p_order->>'project_id')::uuid
        and active and fulfillment_type = 'joko_fulfillment' for share;
    if not found then raise exception 'Fulfillment shipping option unavailable.'; end if;
    if (p_order->>'shipping_amount_xof')::integer is distinct from v_option.amount_xof
      or p_commission_xof <> round(greatest(coalesce((p_order->>'amount_xof')::numeric, 0) - v_option.amount_xof, 0)
          * coalesce(v_option.commission_bps, 1500) / 10000)::integer then
      raise exception 'Fulfillment pricing changed; refresh checkout.';
    end if;
    select string_agg(format('%I', k), ', ' order by k),
           string_agg(format('r.%I', k), ', ' order by k)
      into v_columns, v_values from jsonb_object_keys(p_order) k;
    execute format('insert into public.shop_orders (%s) select %s from jsonb_populate_record(null::public.shop_orders, $1) r returning *', v_columns, v_values)
      into v_order using p_order;
    insert into public.shop_fulfillment_orders(order_id, project_id, shipping_option_id, commission_xof)
      values(v_order.id, v_order.project_id, v_order.shipping_option_id, p_commission_xof);
  end if;
  return jsonb_build_object('id', v_order.id, 'order_number', to_jsonb(v_order)->'order_number',
    'gift_public_id', to_jsonb(v_order)->'gift_public_id');
end;
$$;
revoke all on function public.create_shop_order_with_fulfillment(jsonb, integer) from public, anon, authenticated;
grant execute on function public.create_shop_order_with_fulfillment(jsonb, integer) to service_role;
notify pgrst, 'reload schema';
