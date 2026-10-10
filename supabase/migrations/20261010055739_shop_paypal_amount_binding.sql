-- Capture verifies the exact amount/currency sent at checkout creation, not a later FX rate.
alter table public.shop_orders
  add column if not exists provider_amount_value text
    check (provider_amount_value is null or provider_amount_value ~ '^[0-9]+(\.[0-9]{1,2})?$'),
  add column if not exists provider_amount_currency text
    check (provider_amount_currency is null or provider_amount_currency ~ '^[A-Z]{3}$');
