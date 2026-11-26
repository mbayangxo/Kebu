-- 059 shop gift / buy-for-someone
-- Apply after APPLY_SHOP_ORDERS (through 055). Safe to re-run.
-- Buyer pays; recipient gets delivery contact + optional public gift link.

do $$
begin
  if to_regclass('public.shop_orders') is null then
    raise exception
      'public.shop_orders is missing. Apply APPLY_SHOP_ORDERS.sql first (needs public.projects), then re-run 059.';
  end if;
end $$;

alter table public.shop_orders
  add column if not exists is_gift boolean not null default false,
  add column if not exists recipient_name text,
  add column if not exists recipient_phone text,
  add column if not exists recipient_email text,
  add column if not exists gift_message text,
  add column if not exists gift_public_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_recipient_name_len'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_recipient_name_len
      check (
        recipient_name is null
        or char_length(trim(recipient_name)) between 1 and 80
      );
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_recipient_phone_len'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_recipient_phone_len
      check (
        recipient_phone is null
        or char_length(trim(recipient_phone)) between 8 and 24
      );
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_recipient_email_check'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_recipient_email_check
      check (
        recipient_email is null
        or recipient_email ~* '^[^@]+@[^@]+\.[^@]+$'
      );
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_gift_message_len'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_gift_message_len
      check (
        gift_message is null
        or char_length(gift_message) <= 400
      );
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_gift_requires_recipient'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_gift_requires_recipient
      check (
        is_gift = false
        or (
          recipient_name is not null
          and char_length(trim(recipient_name)) between 1 and 80
          and recipient_phone is not null
          and char_length(trim(recipient_phone)) between 8 and 24
        )
      );
  end if;
end $$;

create unique index if not exists shop_orders_gift_public_id_uidx
  on public.shop_orders (gift_public_id)
  where gift_public_id is not null;

create index if not exists shop_orders_gift_idx
  on public.shop_orders (project_id, is_gift)
  where is_gift = true;

notify pgrst, 'reload schema';
