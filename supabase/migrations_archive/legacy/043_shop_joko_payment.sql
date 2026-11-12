-- JOKO product order pay-in + numeric XOF price for checkout.
-- Apply after 039/041/042.

alter table public.project_products
  add column if not exists price_xof integer
  check (price_xof is null or price_xof >= 0);

alter table public.shop_orders
  add column if not exists payment_status text not null default 'unpaid';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'shop_orders_payment_status_check'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_payment_status_check
      check (
        payment_status in ('unpaid', 'awaiting_payment', 'paid', 'failed')
      );
  end if;
end $$;

alter table public.shop_orders
  add column if not exists joko_reference text,
  add column if not exists joko_payment_id text,
  add column if not exists amount_xof integer
  check (amount_xof is null or amount_xof >= 0);

create index if not exists shop_orders_joko_reference_idx
  on public.shop_orders (joko_reference)
  where joko_reference is not null;

notify pgrst, 'reload schema';
