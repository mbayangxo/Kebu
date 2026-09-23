-- Make terminal payment ledger events retry-safe across duplicate provider webhooks.
create unique index if not exists shop_payment_ledger_terminal_once
  on public.shop_payment_ledger_events(order_id,event_type)
  where order_id is not null and event_type in ('paid','refunded','cancelled');
notify pgrst, 'reload schema';
