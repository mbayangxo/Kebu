create table public.shop_checkout_requests (
 project_id uuid not null references public.projects(id) on delete cascade,
 request_id uuid not null,
 fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
 order_id uuid unique references public.shop_orders(id) on delete no action deferrable initially deferred,
 primary key(project_id,request_id)
);
alter table public.shop_checkout_requests enable row level security;
revoke all on public.shop_checkout_requests from public,anon,authenticated;
grant select,insert,update on public.shop_checkout_requests to service_role;

create or replace function public.lookup_shop_checkout_request(p_project_id uuid,p_request_id uuid,p_fingerprint text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.shop_checkout_requests; h public.shop_orders;
begin
 select * into r from public.shop_checkout_requests where project_id=p_project_id and request_id=p_request_id;
 if not found then return null; end if;
 if r.fingerprint is distinct from p_fingerprint then raise exception 'Checkout request changed. Start a new checkout.'; end if;
 if r.order_id is null then return null; end if;
 select * into h from public.shop_orders where id=r.order_id and project_id=p_project_id;
 if not found then raise exception 'Checkout receipt needs reconciliation.'; end if;
 return jsonb_build_object('orderId',h.id,'orderNumber',h.order_number,'status',h.status,
 'paid',h.payment_status='paid','giftPublicId',h.gift_public_id,
 'paymentUrl',case when h.status<>'cancelled' and h.payment_status in ('unpaid','awaiting_payment') then h.checkout_url else null end,
 'message',case when h.payment_status='paid' then 'Your order is paid.'
 when h.payment_status='refunded' then 'Your order has been refunded.'
 when h.status='cancelled' then 'Your order has been cancelled.'
 else 'Your existing order is saved. Check its payment link or contact the shop to confirm payment.' end);
end $$;
revoke all on function public.lookup_shop_checkout_request(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.lookup_shop_checkout_request(uuid,uuid,text) to service_role;
notify pgrst,'reload schema';

create or replace function public.save_shop_checkout_atomic(
 p_order jsonb,p_items jsonb,p_discount_id uuid default null,
 p_gift_card_id uuid default null,p_expected_gift_balance integer default null
) returns jsonb language plpgsql security definer set search_path = public,pg_temp as $$
declare
 h public.shop_orders; saved public.shop_orders; line jsonb; demand record;
 product public.project_products; variant public.project_product_variants;
 effects jsonb := '[]'::jsonb; gift_amount integer; request_key uuid; fingerprint text; receipt public.shop_checkout_requests; previous jsonb;
begin
 if jsonb_typeof(p_order) is distinct from 'object' or jsonb_typeof(p_items) is distinct from 'array'
 or jsonb_array_length(p_items) not between 1 and 24 then raise exception 'Invalid checkout.'; end if;
 h := jsonb_populate_record(null::public.shop_orders,p_order);
 request_key := (p_order->>'_request_id')::uuid;
 fingerprint := p_order->>'_request_fingerprint';
 if request_key is not null then
   if fingerprint is null or fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'Invalid checkout fingerprint.'; end if;
   insert into public.shop_checkout_requests(project_id,request_id,fingerprint)
   values(h.project_id,request_key,fingerprint) on conflict(project_id,request_id) do nothing;
   select * into receipt from public.shop_checkout_requests
   where project_id=h.project_id and request_id=request_key for update;
   if receipt.fingerprint is distinct from fingerprint then raise exception 'Checkout request changed. Start a new checkout.'; end if;
   if receipt.order_id is not null then
     previous := public.lookup_shop_checkout_request(h.project_id,request_key,fingerprint);
     return jsonb_build_object('id',previous->>'orderId','order_number',previous->>'orderNumber',
     'gift_public_id',previous->>'giftPublicId','paid',previous->'paid','replayed',true);
   end if;
 end if;
 if exists(select 1 from jsonb_array_elements(p_items) x where
   jsonb_typeof(x->'quantity') is distinct from 'number'
   or (x->>'quantity') !~ '^[0-9]+$' or (x->>'quantity')::int not between 1 and 20)
 then raise exception 'Invalid item quantity.'; end if;
 if h.quantity is distinct from (select sum((x->>'quantity')::int) from jsonb_array_elements(p_items)x)
 or h.product_id is distinct from (p_items->0->>'product_id')::uuid
 then raise exception 'Invalid checkout totals.'; end if;
 -- Lock products before variants, in stable ID order for every checkout.
 for demand in select (x->>'product_id')::uuid id,sum((x->>'quantity')::int)::int qty
 from jsonb_array_elements(p_items)x group by 1 order by 1 loop
   select * into product from public.project_products where id=demand.id for update;
   if not found or product.project_id is distinct from h.project_id or not product.is_active
   then raise exception 'A product is no longer available.'; end if;
   if product.track_stock and coalesce(product.stock_qty,0)<demand.qty
   then raise exception 'Not enough product stock.'; end if;
 end loop;
 for demand in select (x->>'variant_id')::uuid id,(x->>'product_id')::uuid product_id,
 sum((x->>'quantity')::int)::int qty from jsonb_array_elements(p_items)x
 where nullif(x->>'variant_id','') is not null group by 1,2 order by 1 loop
   select * into variant from public.project_product_variants where id=demand.id for update;
   if not found or variant.product_id is distinct from demand.product_id
   or variant.project_id is distinct from h.project_id or not variant.is_active
   then raise exception 'A variant is no longer available.'; end if;
   if variant.stock_qty is not null and variant.stock_qty<demand.qty
   then raise exception 'Not enough variant stock.'; end if;
 end loop;
 if p_discount_id is not null then
   update public.shop_discount_codes set uses_count=uses_count+1,updated_at=now()
   where id=p_discount_id and project_id=h.project_id and code=h.discount_code
   and percent_off=h.discount_percent and is_active
   and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>=now())
   and (max_uses is null or uses_count<max_uses);
   if not found then raise exception 'Discount changed or reached its use limit. Please try again.'; end if;
 elsif h.discount_code is not null or h.discount_percent is not null then
   raise exception 'Invalid discount.';
 end if;
 gift_amount:=coalesce(h.gift_card_amount_xof,0);
 if p_gift_card_id is not null then
   if gift_amount<1 or p_expected_gift_balance is null then raise exception 'Invalid gift card amount.'; end if;
   update public.shop_gift_cards set balance_xof=balance_xof-gift_amount,
   status=case when balance_xof=gift_amount then 'depleted' else 'active' end,updated_at=now()
   where id=p_gift_card_id and project_id=h.project_id and code=h.gift_card_code
   and status='active' and balance_xof=p_expected_gift_balance and balance_xof>=gift_amount
   and (expires_at is null or expires_at>=now());
   if not found then raise exception 'Gift card balance changed. Please try again.'; end if;
 elsif gift_amount<>0 or h.gift_card_code is not null then raise exception 'Invalid gift card.'; end if;
 insert into public.shop_orders(project_id,product_id,product_name,price_label,quantity,customer_name,customer_phone,customer_note,payment_preference,channel,order_number,customer_user_id,customer_email,product_upc,product_sku,discount_code,discount_percent,amount_xof_before_discount,amount_xof,is_gift,recipient_name,recipient_phone,recipient_email,gift_message,gift_public_id,gift_card_code,gift_card_amount_xof,buyer_country_code,shipping_amount_xof,shipping_eta_min_days,shipping_eta_max_days,shipping_corridor,shipping_trust_label,shipping_quote_version,status,payment_status)
 values(h.project_id,h.product_id,h.product_name,coalesce(h.price_label,''),h.quantity,h.customer_name,h.customer_phone,coalesce(h.customer_note,''),coalesce(h.payment_preference,'whatsapp'),coalesce(h.channel,'whatsapp'),h.order_number,h.customer_user_id,h.customer_email,h.product_upc,h.product_sku,h.discount_code,h.discount_percent,h.amount_xof_before_discount,h.amount_xof,coalesce(h.is_gift,false),h.recipient_name,h.recipient_phone,h.recipient_email,h.gift_message,h.gift_public_id,h.gift_card_code,h.gift_card_amount_xof,h.buyer_country_code,h.shipping_amount_xof,h.shipping_eta_min_days,h.shipping_eta_max_days,coalesce(h.shipping_corridor,''),h.shipping_trust_label,coalesce(h.shipping_quote_version,''),'pending','unpaid')
 returning * into saved;
 for line in select value from jsonb_array_elements(p_items) loop
   select * into product from public.project_products where id=(line->>'product_id')::uuid;
   variant:=null;
   if nullif(line->>'variant_id','') is not null then
     select * into variant from public.project_product_variants where id=(line->>'variant_id')::uuid;
   end if;
   if product.has_variants and variant.id is null then raise exception 'Choose a product variant.'; end if;
   if product.track_stock then
     update public.project_products set stock_qty=stock_qty-(line->>'quantity')::int,updated_at=now() where id=product.id;
   end if;
   if variant.stock_qty is not null then
     update public.project_product_variants set stock_qty=stock_qty-(line->>'quantity')::int,updated_at=now() where id=variant.id;
   end if;
   effects:=effects||jsonb_build_array(jsonb_build_object('product_id',product.id,'variant_id',variant.id,
   'product_quantity',case when product.track_stock then (line->>'quantity')::int else 0 end,
   'variant_quantity',case when variant.stock_qty is not null then (line->>'quantity')::int else 0 end));
   insert into public.shop_order_items(order_id,project_id,product_id,variant_id,variant_name,
   product_name,product_upc,product_sku,price_label,price_xof,quantity,line_amount_xof,sort_order)
   values(saved.id,h.project_id,product.id,variant.id,line->>'variant_name',line->>'product_name',
   line->>'product_upc',line->>'product_sku',coalesce(line->>'price_label',''),
   (line->>'price_xof')::int,(line->>'quantity')::int,(line->>'line_amount_xof')::int,
   coalesce((line->>'sort_order')::int,0));
 end loop;
 insert into public.shop_checkout_effects(order_id,project_id,stock_lines,discount_id,gift_card_id,gift_card_amount_xof)
 values(saved.id,h.project_id,effects,p_discount_id,p_gift_card_id,gift_amount);
 if gift_amount>0 then
   insert into public.shop_payment_ledger_events(project_id,order_id,rail,event_type,amount_xof,currency,provider,meta)
   values(h.project_id,saved.id,'manual','paid',gift_amount,'XOF','gift_card',
   jsonb_build_object('gift_card_id',p_gift_card_id));
 end if;
 if gift_amount>0 and h.amount_xof=0 then
   update public.shop_orders set payment_status='paid',status='contacted',payment_provider='manual',updated_at=now()
   where id=saved.id returning * into saved;
 end if;
 if request_key is not null then
   update public.shop_checkout_requests set order_id=saved.id where project_id=h.project_id and request_id=request_key;
 end if;
 return jsonb_build_object('id',saved.id,'order_number',saved.order_number,'gift_public_id',saved.gift_public_id,
 'paid',saved.payment_status='paid');
end $$;

