alter table public.shop_checkout_effects add column gift_refunded_at timestamptz;

create table public.shop_order_returns (
 order_id uuid primary key references public.shop_orders(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete cascade,
 recorded_by uuid not null references auth.users(id),
 reference text not null check(char_length(trim(reference)) between 3 and 200),
 created_at timestamptz not null default now()
);
alter table public.shop_order_returns enable row level security;
revoke all on public.shop_order_returns from public,anon,authenticated;
grant select,insert on public.shop_order_returns to service_role;
create index shop_order_returns_project_idx on public.shop_order_returns(project_id);
create index shop_order_returns_actor_idx on public.shop_order_returns(recorded_by);

-- Restores the gift portion of a full refund; deliberately does not move inventory.
create or replace function public.refund_shop_gift_tender(p_order_id uuid,p_project_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare h public.shop_orders; e public.shop_checkout_effects;
begin
 select * into h from public.shop_orders where id=p_order_id and project_id=p_project_id for update;
 if not found or h.payment_status not in ('paid','refunded') or h.status='cancelled'
 then raise exception 'Only a paid order can be refunded.'; end if;
 select * into e from public.shop_checkout_effects where order_id=h.id and project_id=p_project_id for update;
 if coalesce(h.gift_card_amount_xof,0)>0 and
 (not found or e.gift_card_id is null or e.gift_card_amount_xof is distinct from h.gift_card_amount_xof)
 then raise exception 'This older order needs gift credit reconciliation before refunding.'; end if;
 if e.gift_card_amount_xof>0 and e.gift_refunded_at is null then
   update public.shop_gift_cards set balance_xof=balance_xof+e.gift_card_amount_xof,
   status=case when status='depleted' then 'active' else status end,updated_at=now()
   where id=e.gift_card_id and project_id=p_project_id;
   if not found then raise exception 'Gift credit account is unavailable.'; end if;
   update public.shop_checkout_effects set gift_refunded_at=now() where order_id=h.id;
   insert into public.shop_payment_ledger_events(project_id,order_id,rail,event_type,amount_xof,currency,provider,meta)
   values(p_project_id,h.id,'manual','refunded',e.gift_card_amount_xof,'XOF','gift_card',
   jsonb_build_object('gift_card_id',e.gift_card_id));
 end if;
end $$;
revoke all on function public.refund_shop_gift_tender(uuid,uuid) from public,anon,authenticated,service_role;

create or replace function public.refund_gift_paid_shop_order(p_order_id uuid,p_project_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare h public.shop_orders;
begin
 select * into h from public.shop_orders where id=p_order_id and project_id=p_project_id for update;
 if not found then raise exception 'Order not found.'; end if;
 if h.amount_xof is distinct from 0 or coalesce(h.gift_card_amount_xof,0)<=0
 then raise exception 'Record the returned cash payment before refunding this order.'; end if;
 perform public.refund_shop_gift_tender(h.id,p_project_id);
 update public.shop_orders set payment_status='refunded',refunded_at=coalesce(refunded_at,now()),
 refund_note='Gift credit restored',updated_at=now() where id=h.id returning * into h;
 return to_jsonb(h);
end $$;
revoke all on function public.refund_gift_paid_shop_order(uuid,uuid) from public,anon,authenticated;
grant execute on function public.refund_gift_paid_shop_order(uuid,uuid) to service_role;

create or replace function public.record_external_shop_refund(
 p_order_id uuid,p_project_id uuid,p_recorded_by uuid,p_reference text
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare h public.shop_orders; receipt public.shop_external_refund_receipts;
begin
 if char_length(trim(p_reference)) not between 3 and 200 or p_reference is null
 then raise exception 'Enter the refund receipt or reference.'; end if;
 select * into h from public.shop_orders where id=p_order_id and project_id=p_project_id for update;
 if not found then raise exception 'Order not found.'; end if;
 select * into receipt from public.shop_external_refund_receipts where order_id=h.id;
 if found then
   if receipt.reference is distinct from trim(p_reference) then raise exception 'A different refund is already recorded.'; end if;
   perform public.refund_shop_gift_tender(h.id,p_project_id);
   return to_jsonb(h);
 end if;
 if h.payment_status<>'paid' or coalesce(h.amount_xof,0)<=0 or h.status='cancelled'
 then raise exception 'Only a paid order with a known amount can have a refund recorded.'; end if;
 perform public.refund_shop_gift_tender(h.id,p_project_id);
 insert into public.shop_external_refund_receipts(order_id,project_id,recorded_by,reference,amount_xof)
 values(h.id,p_project_id,p_recorded_by,trim(p_reference),h.amount_xof);
 insert into public.shop_payment_ledger_events(project_id,order_id,rail,event_type,amount_xof,currency,provider,provider_reference,meta)
 values(p_project_id,h.id,'manual','refunded',h.amount_xof,'XOF','external',trim(p_reference),
 jsonb_build_object('recorded_by',p_recorded_by,'merchant_attested',true));
 update public.shop_orders set payment_status='refunded',refunded_at=now(),
 refund_note=trim(p_reference),updated_at=now() where id=h.id returning * into h;
 return to_jsonb(h);
end $$;

-- The caller has checked merchant access and explicit receipt/resalability confirmation.
create or replace function public.record_resalable_shop_return(
 p_order_id uuid,p_project_id uuid,p_recorded_by uuid,p_reference text
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare h public.shop_orders; e public.shop_checkout_effects; receipt public.shop_order_returns; line jsonb;
begin
 if p_reference is null or char_length(trim(p_reference)) not between 3 and 200
 then raise exception 'Enter the return receipt or reference.'; end if;
 select * into h from public.shop_orders where id=p_order_id and project_id=p_project_id for update;
 if not found then raise exception 'Order not found.'; end if;
 select * into receipt from public.shop_order_returns where order_id=h.id;
 if found then
   if receipt.reference is distinct from trim(p_reference) then raise exception 'A different return is already recorded.'; end if;
   return to_jsonb(h);
 end if;
 if h.payment_status<>'refunded' or h.status='cancelled'
 then raise exception 'Refund the full order before recording its return.'; end if;
 select * into e from public.shop_checkout_effects where order_id=h.id and project_id=p_project_id for update;
 if not found or e.cancelled_at is not null
 then raise exception 'This older order needs inventory reconciliation before returning.'; end if;
 if e.gift_card_amount_xof>0 and e.gift_refunded_at is null
 then raise exception 'Refund the full order before recording its return.'; end if;
 perform 1 from public.project_products where id in
 (select (x->>'product_id')::uuid from jsonb_array_elements(e.stock_lines)x) order by id for update;
 perform 1 from public.project_product_variants where id in
 (select (x->>'variant_id')::uuid from jsonb_array_elements(e.stock_lines)x) order by id for update;
 for line in select value from jsonb_array_elements(e.stock_lines) loop
   if (line->>'product_quantity')::int>0 then
     update public.project_products set stock_qty=coalesce(stock_qty,0)+(line->>'product_quantity')::int,updated_at=now()
     where id=(line->>'product_id')::uuid and project_id=p_project_id;
     if not found then raise exception 'A returned product needs inventory reconciliation.'; end if;
   end if;
   if (line->>'variant_quantity')::int>0 then
     update public.project_product_variants set stock_qty=coalesce(stock_qty,0)+(line->>'variant_quantity')::int,updated_at=now()
     where id=(line->>'variant_id')::uuid and project_id=p_project_id;
     if not found then raise exception 'A returned variant needs inventory reconciliation.'; end if;
   end if;
 end loop;
 insert into public.shop_order_returns(order_id,project_id,recorded_by,reference)
 values(h.id,p_project_id,p_recorded_by,trim(p_reference));
 update public.shop_orders set status='archived',archived_at=coalesce(archived_at,now()),updated_at=now()
 where id=h.id returning * into h;
 return to_jsonb(h);
end $$;
revoke all on function public.record_resalable_shop_return(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.record_resalable_shop_return(uuid,uuid,uuid,text) to service_role;

create or replace function public.guard_shop_order_lifecycle()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if old.status='cancelled' and
 (new.status<>'cancelled' or new.payment_status is distinct from old.payment_status)
 then raise exception 'A cancelled order cannot be reopened or paid.'; end if;
 if old.payment_status='refunded' and new.payment_status<>'refunded'
 then raise exception 'A refunded payment cannot be reopened.'; end if;
 if exists(select 1 from public.shop_order_returns where order_id=old.id) and new.status<>'archived'
 then raise exception 'A returned order cannot be reopened.'; end if;
 if new.status='cancelled' and old.status<>'cancelled' and not exists(
 select 1 from public.shop_checkout_effects where order_id=old.id and cancelled_at is not null)
 then raise exception 'Cancel this order through the inventory reconciliation transaction.'; end if;
 return new;
end $$;
notify pgrst,'reload schema';

create or replace function public.save_shop_checkout_atomic(
 p_order jsonb,p_items jsonb,p_discount_id uuid default null,
 p_gift_card_id uuid default null,p_expected_gift_balance integer default null
) returns jsonb language plpgsql security definer set search_path = public,pg_temp as $$
declare
 h public.shop_orders; saved public.shop_orders; line jsonb; demand record;
 product public.project_products; variant public.project_product_variants;
 effects jsonb := '[]'::jsonb; gift_amount integer;
begin
 if jsonb_typeof(p_order) is distinct from 'object' or jsonb_typeof(p_items) is distinct from 'array'
 or jsonb_array_length(p_items) not between 1 and 24 then raise exception 'Invalid checkout.'; end if;
 h := jsonb_populate_record(null::public.shop_orders,p_order);
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
 return jsonb_build_object('id',saved.id,'order_number',saved.order_number,'gift_public_id',saved.gift_public_id,
 'paid',saved.payment_status='paid');
end $$;

