-- Extend the Search index to a fifth and sixth mode: Research and Trade,
-- both covering the one real, public-facing country-intelligence dataset in
-- this codebase -- public.country_profiles (the Opportunity OS Country
-- Explorer's own table, live since the original Alkebulan schema). Its own
-- RLS policy ("Anyone can read published country profiles") already allows
-- anyone to read a published profile's full contents; this mode makes that
-- real, already-public data searchable under two different lenses (market
-- intelligence vs. trade context) rather than inventing a new source.
-- No new search_documents columns needed. Additive only.

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
  add constraint search_documents_mode_check
  check (mode in ('sites', 'opportunities', 'businesses', 'products', 'people', 'research', 'trade'));
