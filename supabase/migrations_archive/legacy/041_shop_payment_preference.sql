-- Shop orders: customer payment preference (card / PayPal / COD / …).
-- Not a live PSP charge — preference + merchant instructions only until product checkout is wired.

alter table public.shop_orders
  add column if not exists payment_preference text not null default 'whatsapp';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'shop_orders_payment_preference_check'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_payment_preference_check
      check (
        payment_preference in (
          'whatsapp',
          'cod',
          'mobile_money',
          'card',
          'paypal',
          'joko'
        )
      );
  end if;
end $$;
