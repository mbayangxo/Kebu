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
 if e.gift_card_amount_xof>0 then
   insert into public.shop_payment_ledger_events(project_id,order_id,rail,event_type,amount_xof,currency,provider,meta)
   values(p_project_id,h.id,'manual','refunded',e.gift_card_amount_xof,'XOF','gift_card',
   jsonb_build_object('gift_card_id',e.gift_card_id,'reason','cancellation'));
 end if;
 update public.shop_checkout_effects set cancelled_at=now(),
 gift_refunded_at=case when gift_card_amount_xof>0 then now() else gift_refunded_at end where order_id=h.id;
 update public.shop_orders set status='cancelled',updated_at=now() where id=h.id returning * into h;
 return to_jsonb(h);
end $$;

notify pgrst,'reload schema';
