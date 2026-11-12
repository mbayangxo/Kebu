-- Extend the Search index to a fourth mode: buyable goods, covering both
-- real product catalogs in this codebase -- project_products (Kebu Shop,
-- tied to a published site) and marketplace_templates (the Studio
-- template/creative-asset marketplace). Matches docs/product/KEBU-SEARCH.md's
-- own mode description: "Products -- Buyable goods (Kebu Shop + indexed
-- catalog)". Additive only: existing modes/rows are unchanged.

do $$
declare
  existing_constraint text;
  mode_attnum smallint;
begin
  select attnum into mode_attnum
  from pg_attribute
  where attrelid = 'public.search_documents'::regclass
    and attname = 'mode'
    and not attisdropped;

  select c.conname into existing_constraint
  from pg_constraint c
  where c.conrelid = 'public.search_documents'::regclass
    and c.contype = 'c'
    and c.conkey = array[mode_attnum]::smallint[]
  limit 1;

  if existing_constraint is not null then
    execute format('alter table public.search_documents drop constraint %I', existing_constraint);
  end if;
end $$;

alter table public.search_documents
  add constraint search_documents_mode_check check (mode in ('sites', 'opportunities', 'businesses', 'products'));

-- category already exists (added for businesses mode) and is reused here for
-- marketplace_templates.category; project_products has no category concept
-- in its own schema, so that column is simply left null for shop products --
-- not derived or guessed.
-- price_label is a new, generic, already-human-readable column: project_products
-- already stores one verbatim (its own currency formatting); marketplace_templates
-- has no equivalent, so the indexer formats price_cents into one. Neither value
-- is parsed back out of it -- it exists for display only, same spirit as summary.
alter table public.search_documents
  add column if not exists price_label text;
