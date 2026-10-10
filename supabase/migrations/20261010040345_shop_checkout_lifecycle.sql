-- 069 — Cross-border shipping quote fields on shop_orders (SN→GH corridor v1)
-- Apply after 068.

alter table public.shop_orders
  add column if not exists buyer_country_code char(2),
  add column if not exists shipping_amount_xof integer
    check (shipping_amount_xof is null or shipping_amount_xof >= 0),
  add column if not exists shipping_eta_min_days integer
    check (shipping_eta_min_days is null or shipping_eta_min_days >= 0),
  add column if not exists shipping_eta_max_days integer
    check (shipping_eta_max_days is null or shipping_eta_max_days >= 0),
  add column if not exists shipping_corridor text not null default ''
    check (char_length(shipping_corridor) <= 16),
  add column if not exists shipping_trust_label text
    check (shipping_trust_label is null or shipping_trust_label in ('estimate', 'partner_rate')),
  add column if not exists shipping_quote_version text not null default ''
    check (char_length(shipping_quote_version) <= 40);

comment on column public.shop_orders.shipping_trust_label is
  'estimate = Kebu corridor table; partner_rate = live partner API (not yet).';

notify pgrst, 'reload schema';

-- Header quantity is the sum of up to 24 validated item quantities.
alter table public.shop_orders drop constraint if exists shop_orders_quantity_check;
alter table public.shop_orders add constraint shop_orders_quantity_check check(quantity between 1 and 480);
alter table public.shop_orders drop constraint if exists shop_orders_channel_check;
alter table public.shop_orders add constraint shop_orders_channel_check
 check(channel in ('whatsapp','demo','web','share','social','qr','wave','joko'));
alter table public.shop_orders drop constraint if exists shop_orders_payment_preference_check;
alter table public.shop_orders add constraint shop_orders_payment_preference_check
 check(payment_preference in ('whatsapp','mbolo','cod','mobile_money','card','paypal','joko'));
alter table public.shop_orders drop constraint if exists shop_orders_recipient_email_check;
alter table public.shop_orders add constraint shop_orders_recipient_email_check
 check(recipient_email is null or recipient_email ~* '^[^@]+@[^@]+[.][^@]+$');

-- Browser roles cannot alter the evidence used to restore inventory or tender.
create table public.shop_checkout_effects (
 order_id uuid primary key references public.shop_orders(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete cascade,
 stock_lines jsonb not null,
 discount_id uuid references public.shop_discount_codes(id) on delete set null,
 gift_card_id uuid references public.shop_gift_cards(id) on delete set null,
 gift_card_amount_xof integer not null default 0 check(gift_card_amount_xof >= 0),
 cancelled_at timestamptz
);
alter table public.shop_checkout_effects enable row level security;
revoke all on public.shop_checkout_effects from public,anon,authenticated;
grant select,insert,update,delete on public.shop_checkout_effects to service_role;

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
 return jsonb_build_object('id',saved.id,'order_number',saved.order_number,'gift_public_id',saved.gift_public_id);
end $$;

create or replace function public.cancel_saved_shop_checkout(p_order_id uuid,p_project_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare h public.shop_orders; e public.shop_checkout_effects; line jsonb;
begin
 select * into h from public.shop_orders where id=p_order_id and project_id=p_project_id for update;
 if not found then raise exception 'Order not found.'; end if;
 select * into e from public.shop_checkout_effects where order_id=h.id and project_id=p_project_id for update;
 if not found then raise exception 'This older order needs inventory reconciliation before cancellation.'; end if;
 if e.cancelled_at is not null then return to_jsonb(h); end if;
 if h.status not in ('pending','contacted') or h.payment_status not in ('unpaid','failed')
 then raise exception 'Resolve the payment or return before cancelling this order.'; end if;
 -- Same product/variant lock ordering as checkout; restore recorded deductions even if tracking changed.
 perform 1 from public.project_products where id in
 (select (x->>'product_id')::uuid from jsonb_array_elements(e.stock_lines)x) order by id for update;
 perform 1 from public.project_product_variants where id in
 (select (x->>'variant_id')::uuid from jsonb_array_elements(e.stock_lines)x) order by id for update;
 for line in select value from jsonb_array_elements(e.stock_lines) loop
   update public.project_products set stock_qty=coalesce(stock_qty,0)+(line->>'product_quantity')::int,updated_at=now()
   where id=(line->>'product_id')::uuid and (line->>'product_quantity')::int>0;
   update public.project_product_variants set stock_qty=coalesce(stock_qty,0)+(line->>'variant_quantity')::int,updated_at=now()
   where id=(line->>'variant_id')::uuid and (line->>'variant_quantity')::int>0;
 end loop;
 -- Lock discounts before gift cards, as in checkout.
 update public.shop_discount_codes set uses_count=greatest(0,uses_count-1),updated_at=now() where id=e.discount_id;
 update public.shop_gift_cards set balance_xof=balance_xof+e.gift_card_amount_xof,
 status=case when status='depleted' then 'active' else status end,updated_at=now() where id=e.gift_card_id;
 update public.shop_checkout_effects set cancelled_at=now() where order_id=h.id;
 update public.shop_orders set status='cancelled',updated_at=now() where id=h.id returning * into h;
 return to_jsonb(h);
end $$;
revoke all on function public.save_shop_checkout_atomic(jsonb,jsonb,uuid,uuid,integer) from public,anon,authenticated;
revoke all on function public.cancel_saved_shop_checkout(uuid,uuid) from public,anon,authenticated;
grant execute on function public.save_shop_checkout_atomic(jsonb,jsonb,uuid,uuid,integer) to service_role;
grant execute on function public.cancel_saved_shop_checkout(uuid,uuid) to service_role;
notify pgrst,'reload schema';

-- Enforce terminal state even when a concurrent webhook or an older writer runs.
create or replace function public.guard_shop_order_lifecycle()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if old.status='cancelled' and
 (new.status<>'cancelled' or new.payment_status is distinct from old.payment_status)
 then raise exception 'A cancelled order cannot be reopened or paid.'; end if;
 if old.payment_status='refunded' and new.payment_status<>'refunded'
 then raise exception 'A refunded payment cannot be reopened.'; end if;
 if new.status='cancelled' and old.status<>'cancelled' and not exists(
 select 1 from public.shop_checkout_effects where order_id=old.id and cancelled_at is not null)
 then raise exception 'Cancel this order through the inventory reconciliation transaction.'; end if;
 return new;
end $$;
revoke all on function public.guard_shop_order_lifecycle() from public,anon,authenticated;
create trigger shop_order_lifecycle_guard before update on public.shop_orders
for each row execute function public.guard_shop_order_lifecycle();

create table public.shop_external_refund_receipts(
 order_id uuid primary key references public.shop_orders(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete cascade,
 recorded_by uuid not null references auth.users(id),
 reference text not null check(char_length(trim(reference)) between 3 and 200),
 amount_xof integer not null check(amount_xof>0),
 created_at timestamptz not null default now()
);
alter table public.shop_external_refund_receipts enable row level security;
revoke all on public.shop_external_refund_receipts from public,anon,authenticated;
grant select,insert on public.shop_external_refund_receipts to service_role;

-- Records an explicit merchant attestation. This does not call a payment provider.
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
   return to_jsonb(h);
 end if;
 if h.payment_status<>'paid' or coalesce(h.amount_xof,0)<=0 or h.status='cancelled'
 then raise exception 'Only a paid order with a known amount can have a refund recorded.'; end if;
 insert into public.shop_external_refund_receipts(order_id,project_id,recorded_by,reference,amount_xof)
 values(h.id,p_project_id,p_recorded_by,trim(p_reference),h.amount_xof);
 insert into public.shop_payment_ledger_events(project_id,order_id,rail,event_type,amount_xof,currency,provider,provider_reference,meta)
 values(p_project_id,h.id,'manual','refunded',h.amount_xof,'XOF','external',trim(p_reference),
 jsonb_build_object('recorded_by',p_recorded_by,'merchant_attested',true));
 update public.shop_orders set payment_status='refunded',refunded_at=now(),
 refund_note=trim(p_reference),updated_at=now() where id=h.id returning * into h;
 return to_jsonb(h);
end $$;
revoke all on function public.record_external_shop_refund(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.record_external_shop_refund(uuid,uuid,uuid,text) to service_role;

-- Only callers that have verified provider authenticity may use this RPC.
-- Row locking keeps payment state and its one ledger event atomic on replay.
create or replace function public.mark_verified_shop_payment(
 p_reference text,p_provider text default null,p_payment_id text default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare h public.shop_orders; matched uuid[]; provider text;
begin
 if nullif(trim(p_reference),'') is null then raise exception 'Missing payment reference.'; end if;
 select array_agg(id) into matched from public.shop_orders
 where (provider_reference=p_reference or
 (joko_reference=p_reference and (payment_provider='joko' or payment_provider is null)))
 and (p_provider is null or payment_provider=p_provider or
 (p_provider='joko' and payment_provider is null and joko_reference=p_reference));
 if coalesce(array_length(matched,1),0)=0 and p_provider is not null and p_payment_id is not null then
 select array_agg(id) into matched from public.shop_orders
 where provider_payment_id=p_payment_id and payment_provider=p_provider;
 end if;
 if coalesce(array_length(matched,1),0)<>1 then raise exception 'Payment reference is missing or ambiguous.'; end if;
 select * into h from public.shop_orders where id=matched[1] for update;
 provider:=coalesce(p_provider,h.payment_provider,case when h.joko_reference=p_reference then 'joko' end);
 if provider is null or provider not in ('joko','paypal','paystack','wave','orange_money')
 then raise exception 'Unrecognized payment provider.'; end if;
 if h.status='cancelled' or h.payment_status='refunded' then raise exception 'Payment requires reconciliation for a closed order.'; end if;
 if h.payment_status='paid' then
   return jsonb_build_object('orderId',h.id,'projectId',h.project_id,'replayed',true);
 end if;
 update public.shop_orders set payment_status='paid',
 status=case when status='pending' then 'contacted' else status end,
 payment_provider=provider,provider_payment_id=coalesce(p_payment_id,provider_payment_id),
 joko_payment_id=case when provider='joko' then coalesce(p_payment_id,joko_payment_id) else joko_payment_id end,
 updated_at=now() where id=h.id;
 insert into public.shop_payment_ledger_events(project_id,order_id,rail,event_type,amount_xof,currency,provider,provider_reference,meta)
 values(h.project_id,h.id,provider,'paid',h.amount_xof,'XOF',provider,p_reference,
 jsonb_build_object('paymentId',p_payment_id,'joko_cauris_amount',h.joko_cauris_amount));
 return jsonb_build_object('orderId',h.id,'projectId',h.project_id,'replayed',false);
end $$;
revoke all on function public.mark_verified_shop_payment(text,text,text) from public,anon,authenticated;
grant execute on function public.mark_verified_shop_payment(text,text,text) to service_role;

