alter table public.shop_orders add column sales_segment text
  check (sales_segment in ('b2b','b2c'));
