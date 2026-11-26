-- Track whether a cart has been enrolled in an abandoned-cart email flow
alter table public.shop_cart_drafts
  add column if not exists flow_enrolled_at timestamptz;

-- Fast cron scan: open carts with email, not yet enrolled
create index if not exists shop_cart_drafts_enrollable_idx
  on public.shop_cart_drafts (last_seen_at)
  where status = 'open' and customer_email is not null and flow_enrolled_at is null;
