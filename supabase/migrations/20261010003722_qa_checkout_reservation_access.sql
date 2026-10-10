-- Optional legacy checkout objects: browser callers must use the server API.
-- Preserve service operations and data; do not replace privileged function bodies.
do $repair$
declare
  routine regprocedure;
  column_name text;
begin
  if to_regclass('public.shop_checkout_reservations') is not null then
    alter table public.shop_checkout_reservations enable row level security;
    revoke all on table public.shop_checkout_reservations from public, anon, authenticated;
    for column_name in
      select a.attname from pg_attribute a
      where a.attrelid='public.shop_checkout_reservations'::regclass
        and a.attnum>0 and not a.attisdropped
    loop
      execute format('revoke all (%I) on table public.shop_checkout_reservations from public, anon, authenticated', column_name);
    end loop;
    grant select, insert, update, delete on table public.shop_checkout_reservations to service_role;
  end if;

  for routine in
    select p.oid::regprocedure from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind='f'
      and p.proname in ('reserve_multi_shop_checkout', 'commit_shop_checkout',
        'release_shop_checkout', 'complete_shop_payment', 'cancel_shop_order',
        'create_cart_order_atomic')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', routine);
    execute format('grant execute on function %s to service_role', routine);
  end loop;
end
$repair$;
