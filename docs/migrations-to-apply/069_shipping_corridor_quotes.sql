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
