-- Idempotency guard for shop_digital_downloads.
--
-- Enforces at the DB level that at most one download token is issued per
-- (order, product) pair.  createDigitalDownload() checks for an existing row
-- first; this constraint makes concurrent duplicate inserts safe: the loser
-- gets a 23505 unique-violation and falls back to reading the winner's row.

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'shop_digital_downloads_order_product_unique'
  ) then
    alter table public.shop_digital_downloads
      add constraint shop_digital_downloads_order_product_unique
      unique (order_id, product_id);
  end if;
end $$;

notify pgrst, 'reload schema';
