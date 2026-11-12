-- Generic shop payment provider fields (PayPal / Paystack / Wave / …).
-- JOKO columns remain for backward compatibility; new adapters use payment_provider + provider_reference.
-- Apply after APPLY_SHOP_ORDERS through 048–050.

alter table public.shop_orders
  add column if not exists payment_provider text,
  add column if not exists provider_reference text,
  add column if not exists provider_payment_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_payment_provider_check'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_payment_provider_check
      check (
        payment_provider is null
        or payment_provider in (
          'joko', 'paypal', 'paystack', 'wave', 'orange_money', 'manual'
        )
      );
  end if;
end $$;

create unique index if not exists shop_orders_provider_reference_uidx
  on public.shop_orders (payment_provider, provider_reference)
  where provider_reference is not null and payment_provider is not null;

create index if not exists shop_orders_provider_reference_lookup_idx
  on public.shop_orders (provider_reference)
  where provider_reference is not null;

-- Backfill JOKO rows into generic columns when present
update public.shop_orders
set
  payment_provider = coalesce(payment_provider, 'joko'),
  provider_reference = coalesce(provider_reference, joko_reference),
  provider_payment_id = coalesce(provider_payment_id, joko_payment_id)
where joko_reference is not null
  and payment_provider is null;

notify pgrst, 'reload schema';
