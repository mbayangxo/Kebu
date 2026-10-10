create or replace function public.mark_verified_shop_payment(
 p_reference text,p_provider text default null,p_payment_id text default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare h public.shop_orders; matched uuid[]; provider text;
begin
 if p_provider is null or p_provider not in ('joko','paypal','paystack','wave','orange_money')
 then raise exception 'A verified payment provider is required.'; end if;
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
 -- Recheck the binding after acquiring the lock; a concurrent writer may have changed it.
 if (not (h.payment_provider=p_provider or (p_provider='joko' and h.payment_provider is null and h.joko_reference=p_reference))
 or not (h.provider_reference=p_reference or (p_provider='joko' and h.joko_reference=p_reference)
 or (p_payment_id is not null and h.provider_payment_id=p_payment_id))
) is distinct from false then raise exception 'Payment binding changed; reconciliation is required.'; end if;
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


