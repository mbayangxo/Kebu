-- Commerce hardening (Item 8): atomic product stock restoration after refund.
--
-- Called by restockFromRefund() in lib/shop/refunds.ts.
-- Increments stock_qty on project_products (and project_product_variants when
-- the variant is tracked) inside a single statement, protected by a row-level
-- FOR UPDATE lock so concurrent restock calls for the same product do not
-- double-count.

create or replace function public.restore_product_stock_atomic(
  p_product_id  uuid,
  p_quantity     integer,
  p_variant_id   uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'restore_product_stock_atomic: p_quantity must be > 0';
  end if;

  -- Lock the product row to prevent concurrent over-restocking.
  perform id
    from public.project_products
   where id = p_product_id
     for update;

  -- Restore stock only on products that already track it (track_stock = true
  -- and stock_qty is not null).  Skipping non-tracked products is safe: they
  -- have no stock_qty to restore.
  update public.project_products
     set stock_qty   = stock_qty + p_quantity,
         updated_at  = now()
   where id          = p_product_id
     and track_stock = true
     and stock_qty   is not null;

  -- Restore variant stock when the variant has its own tracking.
  if p_variant_id is not null then
    update public.project_product_variants
       set stock_qty  = stock_qty + p_quantity,
           updated_at = now()
     where id          = p_variant_id
       and product_id  = p_product_id
       and track_stock = true
       and stock_qty   is not null;
  end if;
end;
$$;

revoke all on function public.restore_product_stock_atomic(uuid, integer, uuid)
  from public, anon, authenticated;

grant execute on function public.restore_product_stock_atomic(uuid, integer, uuid)
  to service_role;
