-- Audio/video uploads + canvas text blocks (migration 029)
-- Safe to re-run. Fixes legacy section_type rows automatically.

-- ── A) Storage bucket (audio/video MIME types) ──────────────────────────────
update storage.buckets
set
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon',
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/webm',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
where id = 'site-assets';

-- ── B) Drop ALL check constraints on project_sections FIRST ─────────────────
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

-- ── C) Normalize section_type (no constraint active) ─────────────────────────
update public.project_sections
set section_type = trim(section_type)
where section_type is distinct from trim(section_type);

update public.project_sections
set
  section_type = 'text',
  props = coalesce(props, '{}'::jsonb) || jsonb_build_object(
    '_kebuMigratedSectionType', coalesce(section_type, ''),
    'body', coalesce(nullif(trim(props->>'body'), ''), 'Content block (migrated).')
  )
where section_type is null or section_type = '';

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

-- ── D) Add constraint (NOT VALID → validate) ────────────────────────────────
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
