-- =============================================================================
-- RUN THIS FIRST if migration 029 fails with:
--   check constraint "project_sections_section_type_check" ... violated by some row
--
-- Safe to re-run. Does NOT touch storage buckets — only fixes section_type values.
-- After this succeeds, run 029_site_media_and_canvas.sql (or only the bucket part).
-- =============================================================================

-- 1) Remove ALL check constraints on project_sections (old inline + named)
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'project_sections'
      and c.contype = 'c'
  loop
    execute format('alter table public.project_sections drop constraint if exists %I', r.conname);
  end loop;
end $$;

-- 2) Trim whitespace
update public.project_sections
set section_type = trim(section_type)
where section_type is distinct from trim(section_type);

-- 3) Empty / null → text
update public.project_sections
set
  section_type = 'text',
  props = coalesce(props, '{}'::jsonb) || jsonb_build_object(
    '_kebuMigratedSectionType', coalesce(section_type, ''),
    'body', coalesce(nullif(trim(props->>'body'), ''), 'Content block (migrated).')
  )
where section_type is null or section_type = '';

-- 4) Known alias → canonical
update public.project_sections
set section_type = v.canonical
from (values
  ('free_text', 'free-text'),
  ('freetext', 'free-text'),
  ('canvas-text', 'free-text'),
  ('canvas_text', 'free-text'),
  ('maylecor_home', 'maylecor-home'),
  ('maylecorhome', 'maylecor-home'),
  ('maylecor_music', 'maylecor-music'),
  ('maylecorMusic', 'maylecor-music'),
  ('legally_blonde_hero', 'legally-blonde-hero'),
  ('legally-blonde', 'legally-blonde-hero'),
  ('legallyblonde-hero', 'legally-blonde-hero'),
  ('product', 'products'),
  ('shop', 'products'),
  ('store', 'products'),
  ('music', 'audio'),
  ('spotify', 'audio'),
  ('youtube', 'video'),
  ('photos', 'gallery'),
  ('photo', 'image'),
  ('cta', 'hero'),
  ('banner', 'hero'),
  ('about', 'text'),
  ('services', 'features')
) as v(alias, canonical)
where lower(trim(section_type)) = lower(v.alias);

-- 5) Case-only fixes for canonical slugs (Video → video, etc.)
update public.project_sections
set section_type = v.canonical
from (values
  ('navigation', 'navigation'),
  ('hero', 'hero'),
  ('text', 'text'),
  ('image', 'image'),
  ('gallery', 'gallery'),
  ('video', 'video'),
  ('audio', 'audio'),
  ('map', 'map'),
  ('events', 'events'),
  ('features', 'features'),
  ('testimonials', 'testimonials'),
  ('faq', 'faq'),
  ('products', 'products'),
  ('contact', 'contact'),
  ('newsletter', 'newsletter'),
  ('whatsapp', 'whatsapp'),
  ('footer', 'footer'),
  ('heading', 'heading'),
  ('paragraph', 'paragraph'),
  ('button', 'button'),
  ('free-text', 'free-text'),
  ('maylecor-home', 'maylecor-home'),
  ('maylecor-music', 'maylecor-music'),
  ('legally-blonde-hero', 'legally-blonde-hero')
) as v(alias, canonical)
where lower(trim(section_type)) = lower(v.alias)
  and section_type is distinct from v.canonical;

-- 6) Anything still unknown → text (records original type)
update public.project_sections
set
  section_type = 'text',
  props = coalesce(props, '{}'::jsonb) || jsonb_build_object(
    '_kebuMigratedSectionType', section_type,
    'body', coalesce(
      nullif(trim(props->>'body'), ''),
      'Content block (migrated from type: ' || section_type || ').'
    )
  )
where section_type not in (
  'navigation', 'hero', 'text', 'image', 'gallery', 'video', 'audio', 'map', 'events',
  'features', 'testimonials', 'faq', 'products', 'contact', 'newsletter', 'whatsapp', 'footer',
  'heading', 'paragraph', 'button', 'free-text',
  'maylecor-home', 'maylecor-music', 'legally-blonde-hero'
);

-- 7) Show remaining problems (should return 0 rows)
select section_type, count(*) as rows
from public.project_sections
where section_type not in (
  'navigation', 'hero', 'text', 'image', 'gallery', 'video', 'audio', 'map', 'events',
  'features', 'testimonials', 'faq', 'products', 'contact', 'newsletter', 'whatsapp', 'footer',
  'heading', 'paragraph', 'button', 'free-text',
  'maylecor-home', 'maylecor-music', 'legally-blonde-hero'
)
group by section_type;

-- 8) Re-add constraint (NOT VALID first, then validate — extra safe on huge tables)
alter table public.project_sections drop constraint if exists project_sections_section_type_check;

alter table public.project_sections
  add constraint project_sections_section_type_check
  check (section_type in (
    'navigation', 'hero', 'text', 'image', 'gallery', 'video', 'audio', 'map', 'events',
    'features', 'testimonials', 'faq', 'products', 'contact', 'newsletter', 'whatsapp', 'footer',
    'heading', 'paragraph', 'button', 'free-text',
    'maylecor-home', 'maylecor-music', 'legally-blonde-hero'
  ))
  not valid;

alter table public.project_sections validate constraint project_sections_section_type_check;

insert into public.builder_schema_meta (key, value)
values ('website_builder_version', '29')
on conflict (key) do update set value = excluded.value, updated_at = now();

select 'section_type repair complete' as status;
