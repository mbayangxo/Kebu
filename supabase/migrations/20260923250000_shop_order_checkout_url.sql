-- Store the PSP-issued checkout URL on an order so an unpaid customer can
-- resume an existing session without creating a duplicate PSP charge.
-- The column is nullable: pre-migration orders and non-redirect flows leave it null.

alter table public.shop_orders
  add column if not exists checkout_url text;
