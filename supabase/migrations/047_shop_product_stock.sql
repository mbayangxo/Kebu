-- Product stock tracking (optional per product).
-- track_stock=false → unlimited. track_stock=true → stock_qty is authoritative.
-- Apply after 046.

alter table public.project_products
  add column if not exists track_stock boolean not null default false,
  add column if not exists stock_qty integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'project_products_stock_qty_nonneg'
  ) then
    alter table public.project_products
      add constraint project_products_stock_qty_nonneg
      check (stock_qty is null or stock_qty >= 0);
  end if;
end $$;

-- When tracking starts without a qty, treat as 0 (sold out until merchant sets).
update public.project_products
set stock_qty = 0
where track_stock = true and stock_qty is null;

notify pgrst, 'reload schema';
