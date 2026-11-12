-- "A Kebu Checkout, like Shopify has" — the marketplaces' buyer checkout
-- stops being Joko-only and reuses the SAME multi-provider adapter registry
-- Shop already has (lib/payments/registry.ts: Joko, Wave, Orange Money,
-- Paystack/card, PayPal). creative_asset_library and aesthetic_library's
-- joko_reference/joko_payment_id columns, added when the buyer checkout
-- was Joko-only, are renamed to provider_reference/provider_payment_id —
-- the same shape every other provider's webhook already expects on
-- shop_orders — and a provider column records which one was actually used.
-- Existing rows (necessarily Joko, since no other provider could have
-- produced them yet) are backfilled accordingly.

alter table public.creative_asset_library
  rename column joko_reference to provider_reference;
alter table public.creative_asset_library
  rename column joko_payment_id to provider_payment_id;
alter table public.creative_asset_library
  add column if not exists provider text check (provider in ('joko', 'wave', 'orange_money', 'card', 'paypal'));
update public.creative_asset_library set provider = 'joko' where provider_reference is not null and provider is null;

alter table public.aesthetic_library
  rename column joko_reference to provider_reference;
alter table public.aesthetic_library
  rename column joko_payment_id to provider_payment_id;
alter table public.aesthetic_library
  add column if not exists provider text check (provider in ('joko', 'wave', 'orange_money', 'card', 'paypal'));
update public.aesthetic_library set provider = 'joko' where provider_reference is not null and provider is null;

create index if not exists idx_creative_asset_library_provider_reference
  on public.creative_asset_library(provider_reference) where provider_reference is not null;
create index if not exists idx_aesthetic_library_provider_reference
  on public.aesthetic_library(provider_reference) where provider_reference is not null;
