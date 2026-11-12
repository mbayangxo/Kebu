-- Extend the Search index to a seventh mode: Culture. The product spec
-- (docs/product/KEBU-SEARCH.md) defines Culture as "RECT videos and
-- creator content," and docs/product/KEBU-RECT-ECOSYSTEM.md is explicit
-- that Kebu is not the media company -- no RECT API, table, or content
-- sync exists anywhere in this codebase, and this migration does not
-- invent one. Per explicit user direction (no real RECT integration is
-- available to build against), this mode is instead backed by the one
-- real cultural/historical content this codebase actually has:
-- country_profiles.cultural_notes/historical_notes/historical_empires/
-- ethnic_groups/business_etiquette/diaspora_notes -- the same real,
-- already-public table Research and Trade already use. This is a
-- deliberate, documented scope choice, not a silent one: the UI and docs
-- both say plainly this is Kebu's own country cultural reference data,
-- not RECT video/creator content, so no one is misled about what they're
-- getting. Additive only.

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
  check (mode in ('sites', 'opportunities', 'businesses', 'products', 'people', 'research', 'trade', 'culture'));
