-- Extend the Phase One search index to a third mode: active Kebu ID businesses.
-- Additive only: existing 'sites' and 'opportunities' rows and behavior are unchanged.

-- Widen the mode check constraint without assuming its (Postgres-assigned) name.
-- Guessing the name and using "drop constraint if exists <guess>" is unsafe here:
-- if the guess is wrong, the drop silently no-ops and the OLD constraint keeps
-- rejecting 'businesses' rows forever, even though this migration "succeeds".
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
  add constraint search_documents_mode_check check (mode in ('sites', 'opportunities', 'businesses'));

-- Real structured columns for business results, instead of reconstructing
-- category/country from the free-text `summary` by splitting on a delimiter
-- (fragile: shifts out of alignment whenever a field is empty, and a country
-- filter built on it as an ILIKE substring match is not an exact match).
alter table public.search_documents
  add column if not exists category text,
  add column if not exists country_code text;

create index if not exists search_documents_country_idx
  on public.search_documents (country_code)
  where country_code is not null;
