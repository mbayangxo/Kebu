-- Extend the Search index to a fifth mode: People & Talent, covering the
-- one real, public-facing creator/developer dataset in this codebase --
-- developer_profiles (the Studio template/creative-asset marketplace's
-- sellers). Its own RLS policy ("Public read approved developer profiles")
-- already allows anyone to read an approved profile's display_name/bio;
-- this mode makes that real, already-public data searchable. No new
-- columns needed -- title/summary/source_url already cover
-- display_name/bio/website_url. Additive only.

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
  add constraint search_documents_mode_check check (mode in ('sites', 'opportunities', 'businesses', 'products', 'people'));
