alter table public.shop_orders
  add column if not exists provider_started_at timestamptz,
  add column if not exists checkout_expires_at timestamptz;
-- Existing owner RLS listing remains usable without exposing bearer tokens or lease IDs.
grant select(id,order_id,project_id,product_id,file_name,expires_at,download_count,max_downloads,created_at,
  delivery_version,recipient_email,notification_started_at,notification_sent_at)
  on public.shop_digital_downloads to authenticated;
create index if not exists shop_digital_downloads_project_created_idx on public.shop_digital_downloads(project_id,created_at);
create index if not exists shop_orders_wave_expiry_idx on public.shop_orders(checkout_expires_at,id)
  where payment_provider='wave' and payment_status='awaiting_payment';
create index if not exists shop_orders_provider_reference_idx on public.shop_orders(payment_provider,provider_reference)
  where provider_reference is not null;
create index if not exists shop_orders_provider_payment_id_idx on public.shop_orders(payment_provider,provider_payment_id)
  where provider_payment_id is not null;

create or replace function public.begin_shop_provider_checkout(
  p_order_id uuid,p_project_id uuid,p_provider text,p_reference text,p_amount_xof int
) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare h public.shop_orders%rowtype;
begin
  select * into h from public.shop_orders where id=p_order_id and project_id=p_project_id for update;
  if not found or h.status not in ('pending','contacted') or h.payment_status not in ('unpaid','failed')
    or h.provider_started_at is not null or h.provider_reference is not null or h.joko_reference is not null
    or not exists(select 1 from public.shop_checkout_effects where order_id=h.id and cancelled_at is null)
    or h.amount_xof is distinct from p_amount_xof or p_amount_xof<=0
    or p_provider is null or p_provider not in ('joko','wave','paypal','paystack','orange_money')
    or p_reference is null or char_length(p_reference) not between 3 and 200
  then raise exception 'Checkout cannot start or already needs reconciliation.'; end if;
  update public.shop_orders set payment_status='awaiting_payment',payment_provider=p_provider,
    provider_reference=p_reference,provider_started_at=now(),updated_at=now() where id=h.id;
  return true;
end $$;
revoke all on function public.begin_shop_provider_checkout(uuid,uuid,text,text,int) from public,anon,authenticated;
grant execute on function public.begin_shop_provider_checkout(uuid,uuid,text,text,int) to service_role;

create or replace function public.finish_shop_provider_checkout(
  p_order_id uuid,p_project_id uuid,p_provider text,p_reference text,p_payment_id text,
  p_checkout_url text,p_amount_value text default null,p_currency text default null,p_expires_at timestamptz default null
) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare h public.shop_orders%rowtype;
begin
  select * into h from public.shop_orders where id=p_order_id and project_id=p_project_id for update;
  if not found or h.status='cancelled' or h.payment_status='refunded'
    or h.provider_started_at is null or h.payment_provider is distinct from p_provider
    or h.provider_reference is distinct from p_reference
    or (p_provider<>'joko' and p_payment_id is null) or char_length(p_payment_id) not between 1 and 200
    or (h.provider_payment_id is not null and h.provider_payment_id is distinct from p_payment_id)
  then raise exception 'Provider checkout needs reconciliation.'; end if;
  update public.shop_orders set provider_payment_id=coalesce(provider_payment_id,p_payment_id),
    provider_amount_value=p_amount_value,provider_amount_currency=p_currency,
    checkout_url=p_checkout_url,checkout_expires_at=p_expires_at,
    joko_reference=case when p_provider='joko' then p_reference else joko_reference end,
    joko_payment_id=case when p_provider='joko' then coalesce(joko_payment_id,p_payment_id) else joko_payment_id end,
    updated_at=now() where id=h.id;
  return true;
end $$;
revoke all on function public.finish_shop_provider_checkout(uuid,uuid,text,text,text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.finish_shop_provider_checkout(uuid,uuid,text,text,text,text,text,text,timestamptz) to service_role;

-- Caller is the server worker after authenticated, exact expired/cancelled Wave evidence.
create or replace function public.expire_verified_wave_checkout(
  p_order_id uuid,p_project_id uuid,p_reference text,p_payment_id text
) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare h public.shop_orders%rowtype;
begin
  select * into h from public.shop_orders where id=p_order_id and project_id=p_project_id for update;
  if not found or h.payment_provider is distinct from 'wave' or h.provider_reference is distinct from p_reference
    or h.provider_payment_id is distinct from p_payment_id or p_payment_id is null
    or h.checkout_expires_at is null or h.checkout_expires_at>now()
  then raise exception 'Expired provider binding does not match.'; end if;
  if h.status='cancelled' and exists(select 1 from public.shop_checkout_effects where order_id=h.id and cancelled_at is not null) then return true; end if;
  if h.payment_status not in ('awaiting_payment','failed') then raise exception 'Payment needs reconciliation before expiry.'; end if;
  update public.shop_orders set payment_status='failed',updated_at=now() where id=h.id;
  perform public.cancel_saved_shop_checkout(h.id,h.project_id);
  insert into public.shop_payment_ledger_events(project_id,order_id,rail,event_type,amount_xof,provider,provider_reference,meta)
    values(h.project_id,h.id,'wave','cancelled',h.amount_xof,'wave',p_reference,jsonb_build_object('reason','verified_provider_expiry','provider_payment_id',p_payment_id));
  return true;
end $$;
revoke all on function public.expire_verified_wave_checkout(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.expire_verified_wave_checkout(uuid,uuid,text,text) to service_role;
